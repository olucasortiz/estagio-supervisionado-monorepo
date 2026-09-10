package com.lionfitness.backend.payment.controller;

import com.lionfitness.backend.payment.dto.MercadoPagoWebhookRequest;
import com.lionfitness.backend.payment.exception.WebhookProcessingException;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoWebhookSignatureValidator;
import com.lionfitness.backend.payment.service.MercadoPagoWebhookService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class MercadoPagoWebhookControllerTest {
    private final MercadoPagoWebhookService service = mock(MercadoPagoWebhookService.class);
    private final MercadoPagoWebhookSignatureValidator validator = mock(MercadoPagoWebhookSignatureValidator.class);
    private final MercadoPagoWebhookController controller = new MercadoPagoWebhookController(service, validator);
    private final MercadoPagoWebhookRequest body = new MercadoPagoWebhookRequest(
            "order.processed", "order", new MercadoPagoWebhookRequest.WebhookData("ORD-1"), "notification-1");

    @Test
    void acceptsValidOrderWebhook() {
        when(validator.validateAndReserve("signature", "request", "ORD-1"))
                .thenReturn(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED);
        assertThat(controller.handleWebhook("ORD-1", "order", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        verify(service).processOrderNotification("ORD-1");
        verify(validator).markCompleted("request");
    }

    @Test
    void rejectsInvalidSignatureWithoutProcessing() {
        when(validator.validateAndReserve(any(), any(), any()))
                .thenReturn(MercadoPagoWebhookSignatureValidator.ReservationResult.INVALID);
        assertThat(controller.handleWebhook("ORD-1", "order", "bad", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(service);
    }

    @Test
    void rejectsNonOrderEvent() {
        assertThat(controller.handleWebhook("ORD-1", "payment", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(service);
    }

    @Test
    void requiresDataIdFromQueryEvenWhenBodyContainsOrderId() {
        assertThat(controller.handleWebhook(null, "order", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(service, validator);
    }

    @Test
    void transientFailureReturnsRetryableStatus() {
        when(validator.validateAndReserve(any(), any(), any()))
                .thenReturn(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED)
                .thenReturn(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED);
        doThrow(new WebhookProcessingException("not committed yet")).doNothing()
                .when(service).processOrderNotification("ORD-1");
        assertThat(controller.handleWebhook("ORD-1", "order", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        verify(validator).release("request");

        assertThat(controller.handleWebhook("ORD-1", "order", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        verify(service, times(2)).processOrderNotification("ORD-1");
        verify(validator).markCompleted("request");
    }

    @Test
    void concurrentReplayDoesNotProcessWebhookAgain() {
        when(validator.validateAndReserve(any(), any(), any()))
                .thenReturn(MercadoPagoWebhookSignatureValidator.ReservationResult.PROCESSING);

        assertThat(controller.handleWebhook("ORD-1", "order", "signature", "request", body).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        verifyNoInteractions(service);
    }

    @Test
    void simultaneousSignedWebhooksProcessOnlyOnce() throws Exception {
        String secret = "concurrent-test-secret";
        String requestId = "request-concurrent";
        String timestamp = String.valueOf(Instant.now().toEpochMilli());
        String manifest = "id:ORD-1;request-id:" + requestId + ";ts:" + timestamp + ";";
        String signature = "ts=" + timestamp + ",v1=" + sign(manifest, secret);
        MercadoPagoWebhookSignatureValidator realValidator =
                new MercadoPagoWebhookSignatureValidator(secret);
        MercadoPagoWebhookService blockingService = mock(MercadoPagoWebhookService.class);
        MercadoPagoWebhookController concurrentController =
                new MercadoPagoWebhookController(blockingService, realValidator);
        CountDownLatch processing = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        doAnswer(invocation -> {
            processing.countDown();
            finish.await();
            return null;
        }).when(blockingService).processOrderNotification("ORD-1");

        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<HttpStatus> first = executor.submit(() -> (HttpStatus) concurrentController
                    .handleWebhook("ORD-1", "order", signature, requestId, body)
                    .getStatusCode());
            assertThat(processing.await(5, TimeUnit.SECONDS)).isTrue();

            assertThat(concurrentController
                    .handleWebhook("ORD-1", "order", signature, requestId, body)
                    .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            finish.countDown();
            assertThat(first.get()).isEqualTo(HttpStatus.OK);
            verify(blockingService, times(1)).processOrderNotification("ORD-1");
        } finally {
            finish.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void acceptsAuthenticOrderWebhookUsingDataIdFromQuery() throws Exception {
        String secret = "order-webhook-test-secret";
        String orderId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
        String requestId = "2066ca19-c6f1-498a-be75-1923005edd06";
        String timestamp = String.valueOf(Instant.now().toEpochMilli());
        String signature = "ts=" + timestamp + ",v1="
                + sign("id:" + orderId.toLowerCase() + ";request-id:" + requestId
                + ";ts:" + timestamp + ";", secret);
        MercadoPagoWebhookService realService = mock(MercadoPagoWebhookService.class);
        MockMvc mockMvc = standaloneSetup(new MercadoPagoWebhookController(
                realService, new MercadoPagoWebhookSignatureValidator(secret))).build();

        mockMvc.perform(post("/payments/webhook")
                        .queryParam("data.id", orderId)
                        .queryParam("type", "order")
                        .header("x-request-id", requestId)
                        .header("x-signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody(orderId)))
                .andExpect(status().isOk());

        verify(realService).processOrderNotification(orderId);
    }

    @Test
    void rejectsOrderWebhookWithInvalidSignatureFromHttpRequest() throws Exception {
        String secret = "order-webhook-test-secret";
        String orderId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
        String requestId = "2066ca19-c6f1-498a-be75-1923005edd06";
        String timestamp = String.valueOf(Instant.now().toEpochMilli());
        MercadoPagoWebhookService realService = mock(MercadoPagoWebhookService.class);
        MockMvc mockMvc = standaloneSetup(new MercadoPagoWebhookController(
                realService, new MercadoPagoWebhookSignatureValidator(secret))).build();

        mockMvc.perform(post("/payments/webhook")
                        .queryParam("data.id", orderId)
                        .queryParam("type", "order")
                        .header("x-request-id", requestId)
                        .header("x-signature", "ts=" + timestamp + ",v1=" + "0".repeat(64))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody(orderId)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(realService);
    }

    private String orderBody(String orderId) {
        return """
                {
                  "action":"order.processed",
                  "type":"order",
                  "id":"notification-1",
                  "data":{"id":"%s"}
                }
                """.formatted(orderId);
    }

    private String sign(String manifest, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
    }
}
