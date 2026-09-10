package com.lionfitness.backend.payment.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MercadoPagoOrderClientTest {
    private MockRestServiceServer server;
    private MercadoPagoOrderClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new MercadoPagoOrderClient(builder.build(), new ObjectMapper(), "test-access-token");
    }

    @Test
    void postsCardUsingOrdersContractAndParsesOrdAndPayIds() {
        server.expect(once(), requestTo("https://api.mercadopago.com/v1/orders"))
                .andExpect(header("Authorization", "Bearer test-access-token"))
                .andExpect(header("X-Idempotency-Key", "idem-1"))
                .andExpect(jsonPath("$.type").value("online"))
                .andExpect(jsonPath("$.processing_mode").value("automatic"))
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
    void getsOrderByOrdId() {
        server.expect(requestTo("https://api.mercadopago.com/v1/orders/ORD-123"))
                .andExpect(header("Authorization", "Bearer test-access-token"))
                .andRespond(withSuccess(responseJson("bank_transfer"), MediaType.APPLICATION_JSON));

        assertThat(client.getOrder("ORD-123").id()).isEqualTo("ORD-123");
        server.verify();
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
