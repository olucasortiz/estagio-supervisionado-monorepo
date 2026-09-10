package com.lionfitness.backend.payment.mercadopago;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

class MercadoPagoWebhookSignatureValidatorTest {
    private static final String SECRET = "test-secret";
    private static final Instant NOW = Instant.parse("2026-09-10T17:00:00Z");
    private final MercadoPagoWebhookSignatureValidator validator =
            new MercadoPagoWebhookSignatureValidator(SECRET, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void validatesSignatureUsingLowercaseOrderId() throws Exception {
        String orderId = "ORD01ABCXYZ";
        String requestId = "request-1";
        String timestamp = String.valueOf(NOW.toEpochMilli());
        String hash = sign("id:ord01abcxyz;request-id:" + requestId + ";ts:" + timestamp + ";");

        String signature = "ts=" + timestamp + ",v1=" + hash;
        assertThat(validator.validateAndReserve(signature, requestId, orderId))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED);
        assertThat(validator.validateAndReserve(signature, requestId, orderId))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.PROCESSING);
        validator.markCompleted(requestId);
        assertThat(validator.validateAndReserve(signature, requestId, orderId))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.COMPLETED);
    }

    @Test
    void rejectsInvalidAndStaleSignatures() throws Exception {
        String stale = String.valueOf(NOW.minusSeconds(600).toEpochMilli());
        String hash = sign("id:ord-1;request-id:req;ts:" + stale + ";");
        assertThat(validator.validateAndReserve("ts=" + stale + ",v1=" + hash, "req", "ORD-1"))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.INVALID);
        assertThat(validator.validateAndReserve(
                "ts=" + NOW.toEpochMilli() + ",v1=bad", "req", "ORD-1"))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.INVALID);
    }

    @Test
    void transientFailureReleaseAllowsLegitimateRetry() throws Exception {
        String requestId = "request-retry";
        String timestamp = String.valueOf(NOW.toEpochMilli());
        String signature = "ts=" + timestamp + ",v1="
                + sign("id:ord-retry;request-id:" + requestId + ";ts:" + timestamp + ";");

        assertThat(validator.validateAndReserve(signature, requestId, "ORD-RETRY"))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED);
        validator.release(requestId);
        assertThat(validator.validateAndReserve(signature, requestId, "ORD-RETRY"))
                .isEqualTo(MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED);
    }

    @Test
    void simultaneousWebhooksWithSameRequestIdHaveOnlyOneReservation() throws Exception {
        String requestId = "request-concurrent";
        String timestamp = String.valueOf(NOW.toEpochMilli());
        String signature = "ts=" + timestamp + ",v1="
                + sign("id:ord-concurrent;request-id:" + requestId + ";ts:" + timestamp + ";");
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<MercadoPagoWebhookSignatureValidator.ReservationResult> first = executor.submit(() -> {
                start.await();
                return validator.validateAndReserve(signature, requestId, "ORD-CONCURRENT");
            });
            Future<MercadoPagoWebhookSignatureValidator.ReservationResult> second = executor.submit(() -> {
                start.await();
                return validator.validateAndReserve(signature, requestId, "ORD-CONCURRENT");
            });
            start.countDown();

            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(
                    MercadoPagoWebhookSignatureValidator.ReservationResult.RESERVED,
                    MercadoPagoWebhookSignatureValidator.ReservationResult.PROCESSING);
        } finally {
            executor.shutdownNow();
        }
    }

    private String sign(String manifest) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
    }
}
