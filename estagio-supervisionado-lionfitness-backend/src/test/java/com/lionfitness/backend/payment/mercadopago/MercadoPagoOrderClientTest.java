package com.lionfitness.backend.payment.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class MercadoPagoOrderClientTest {
    private RestClient.Builder builder;
    private MockRestServiceServer server;
    private MercadoPagoOrderClient client;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = clientWithSandbox(true);
    }

    @Test
    void postsCardUsingOrdersContractAndParsesOrdAndPayIds() {
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andExpect(header("Authorization", "Bearer APP_USR-access-token"))
                .andExpect(header("X-Idempotency-Key", "idem-1"))
                .andExpect(jsonPath("$.type").value("online"))
                .andExpect(jsonPath("$.processing_mode").value("automatic"))
                .andExpect(jsonPath("$.payer.email").value("lionfitness@testuser.com"))
                .andExpect(jsonPath("$.transactions.payments[0].payment_method.type").value("credit_card"))
                .andExpect(jsonPath("$.transactions.payments[0].payment_method.token").value("card-token"))
                .andRespond(withSuccess(responseJson("credit_card"), MediaType.APPLICATION_JSON));

        MercadoPagoOrder order = client.createCardOrder(new BigDecimal("89.90"), "card-token", "visa",
                1, "buyer@testuser.com", "CPF", "123", "external-ref", "idem-1");

        assertThat(order.id()).isEqualTo("ORD-123");
        assertThat(order.firstPayment().orElseThrow().id()).isEqualTo("PAY-123");
        server.verify();
    }

    @Test
    void postsPixWithSandboxPayerEmail() {
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andExpect(header("Authorization", "Bearer APP_USR-access-token"))
                .andExpect(jsonPath("$.payer.email").value("lionfitness@testuser.com"))
                .andExpect(jsonPath("$.transactions.payments[0].payment_method.id").value("pix"))
                .andExpect(jsonPath("$.transactions.payments[0].payment_method.type").value("bank_transfer"))
                .andRespond(withSuccess(responseJson("bank_transfer"), MediaType.APPLICATION_JSON));

        client.createPixOrder(new BigDecimal("89.90"), "student@lionfitness.com.br",
                "external-ref", "idem-pix");

        server.verify();
    }

    @Test
    void keepsRealPayerEmailForCardInProduction() {
        client = clientWithSandbox(false);
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andExpect(header("Authorization", "Bearer APP_USR-access-token"))
                .andExpect(jsonPath("$.payer.email").value("student@lionfitness.com.br"))
                .andRespond(withSuccess(responseJson("credit_card"), MediaType.APPLICATION_JSON));

        client.createCardOrder(new BigDecimal("89.90"), "card-token", "visa",
                1, "student@lionfitness.com.br", "CPF", "123", "external-ref", "idem-card");

        server.verify();
    }

    @Test
    void keepsRealPayerEmailForPixInProduction() {
        client = clientWithSandbox(false);
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andExpect(header("Authorization", "Bearer APP_USR-access-token"))
                .andExpect(jsonPath("$.payer.email").value("student@lionfitness.com.br"))
                .andRespond(withSuccess(responseJson("bank_transfer"), MediaType.APPLICATION_JSON));

        client.createPixOrder(new BigDecimal("89.90"), "student@lionfitness.com.br",
                "external-ref", "idem-pix");

        server.verify();
    }

    @Test
    void getsOrderByOrdId() {
        server.expect(requestTo("https://api.mercadopago.com/v1/orders/ORD-123"))
                .andExpect(header("Authorization", "Bearer APP_USR-access-token"))
                .andRespond(withSuccess(responseJson("bank_transfer"), MediaType.APPLICATION_JSON));

        assertThat(client.getOrder("ORD-123").id()).isEqualTo("ORD-123");
        server.verify();
    }

    @Test
    void classifiesBadRequestWithoutOrderAsDefinitiveRejection() {
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"invalid_email_for_sandbox\",\"message\":\"invalid payer\"}"));

        assertThatThrownBy(() -> client.createPixOrder(new BigDecimal("89.90"),
                "student@lionfitness.com.br", "external-ref", "idem-pix"))
                .isInstanceOfSatisfying(MercadoPagoGatewayException.class, exception -> {
                    assertThat(exception.isDefinitiveClientRejection()).isTrue();
                    assertThat(exception.getGatewayCode()).isEqualTo("invalid_email_for_sandbox");
                });
        server.verify();
    }

    @Test
    void recognizesIdempotencyKeyAlreadyUsedConflict() {
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andRespond(withStatus(HttpStatus.CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"errors\":[{\"code\":\"idempotency_key_already_used\"}]}"));

        assertThatThrownBy(() -> client.createPixOrder(new BigDecimal("89.90"),
                "student@lionfitness.com.br", "external-ref", "idem-pix"))
                .isInstanceOfSatisfying(MercadoPagoGatewayException.class, exception -> {
                    assertThat(exception.isIdempotencyKeyAlreadyUsed()).isTrue();
                    assertThat(exception.isDefinitiveClientRejection()).isTrue();
                });
        server.verify();
    }

    private MercadoPagoOrderClient clientWithSandbox(boolean sandbox) {
        return new MercadoPagoOrderClient(builder.build(), new ObjectMapper(), "APP_USR-access-token", sandbox);
    }

    private String responseJson(String methodType) {
        return """
                {
                  "id":"ORD-123",
                  "type":"online",
                  "processing_mode":"automatic",
                  "external_reference":"external-ref",
                  "total_amount":"89.90",
                  "status":"processed",
                  "status_detail":"accredited",
                  "transactions":{"payments":[{
                    "id":"PAY-123",
                    "amount":"89.90",
                    "status":"processed",
                    "status_detail":"accredited",
                    "payment_method":{"id":"visa","type":"%s"}
                  }]}
                }
                """.formatted(methodType);
    }
}
