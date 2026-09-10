package com.lionfitness.backend.payment.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Component
public class MercadoPagoOrderClient {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoOrderClient.class);
    private static final String ORDERS_URL = "https://api.mercadopago.com/v1/orders";
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String accessToken;

    @Autowired
    public MercadoPagoOrderClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${mercado.pago.access-token}") String accessToken
    ) {
        this(buildRestClient(restClientBuilder), objectMapper, accessToken);
    }

    MercadoPagoOrderClient(RestClient restClient, ObjectMapper objectMapper, String accessToken) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.accessToken = accessToken;
    }

    private static RestClient buildRestClient(RestClient.Builder restClientBuilder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return restClientBuilder.requestFactory(factory).build();
    }

    public MercadoPagoOrder createCardOrder(
            BigDecimal amount,
            String token,
            String paymentMethodId,
            int installments,
            String payerEmail,
            String identificationType,
            String identificationNumber,
            String externalReference,
            String idempotencyKey
    ) {
        Map<String, Object> paymentMethod = new LinkedHashMap<>();
        paymentMethod.put("id", paymentMethodId);
        paymentMethod.put("type", "credit_card");
        paymentMethod.put("token", token);
        paymentMethod.put("installments", installments);

        Map<String, Object> payer = payer(payerEmail, identificationType, identificationNumber);
        return createOrder(amount, externalReference, idempotencyKey, paymentMethod, payer);
    }

    public MercadoPagoOrder createPixOrder(
            BigDecimal amount,
            String payerEmail,
            String externalReference,
            String idempotencyKey
    ) {
        Map<String, Object> paymentMethod = new LinkedHashMap<>();
        paymentMethod.put("id", "pix");
        paymentMethod.put("type", "bank_transfer");
        return createOrder(amount, externalReference, idempotencyKey, paymentMethod, payer(payerEmail, null, null));
    }

    public MercadoPagoOrder getOrder(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalArgumentException("Order ID do Mercado Pago é obrigatório.");
        }
        try {
            MercadoPagoOrder order = restClient.get()
                    .uri(ORDERS_URL + "/" + orderId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(MercadoPagoOrder.class);
            return requireValidOrder(order);
        } catch (RestClientResponseException exception) {
            logger.error("Mercado Pago recusou a consulta de Order: orderId={} httpStatus={}",
                    orderId, exception.getStatusCode().value());
            throw new MercadoPagoGatewayException(
                    "Falha ao consultar a Order no Mercado Pago.",
                    exception.getStatusCode().value(),
                    exception
            );
        } catch (RestClientException exception) {
            logger.error("Falha de conectividade ao consultar Order do Mercado Pago: orderId={}", orderId, exception);
            throw new MercadoPagoGatewayException("Erro de comunicação com o Mercado Pago.", exception);
        }
    }

    private MercadoPagoOrder createOrder(
            BigDecimal amount,
            String externalReference,
            String idempotencyKey,
            Map<String, Object> paymentMethod,
            Map<String, Object> payer
    ) {
        String formattedAmount = amount.setScale(2).toPlainString();
        Map<String, Object> payment = new LinkedHashMap<>();
        payment.put("amount", formattedAmount);
        payment.put("payment_method", paymentMethod);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "online");
        payload.put("processing_mode", "automatic");
        payload.put("external_reference", externalReference);
        payload.put("total_amount", formattedAmount);
        payload.put("description", "Mensalidade Lion Fitness");
        payload.put("payer", payer);
        payload.put("transactions", Map.of("payments", new Object[]{payment}));

        try {
            MercadoPagoOrder order = restClient.post()
                    .uri(ORDERS_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Idempotency-Key", idempotencyKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(MercadoPagoOrder.class);
            return requireValidOrder(order);
        } catch (RestClientResponseException exception) {
            MercadoPagoOrder createdOrder = parseCreatedOrderFromError(exception);
            if (createdOrder != null && isOrderId(createdOrder.id())) {
                return createdOrder;
            }
            logger.error("Mercado Pago recusou a criação da Order: httpStatus={}", exception.getStatusCode().value());
            throw new MercadoPagoGatewayException(
                    "Falha ao criar a Order no Mercado Pago.",
                    exception.getStatusCode().value(),
                    exception
            );
        } catch (RestClientException exception) {
            logger.error("Falha de conectividade ao criar Order no Mercado Pago.", exception);
            throw new MercadoPagoGatewayException("Erro de comunicação com o Mercado Pago.", exception);
        }
    }

    private Map<String, Object> payer(String email, String identificationType, String identificationNumber) {
        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("email", email != null && !email.isBlank() ? email : "aluno@lionfitness.com.br");
        if (identificationNumber != null && !identificationNumber.isBlank()) {
            payer.put("identification", Map.of(
                    "type", identificationType != null && !identificationType.isBlank() ? identificationType : "CPF",
                    "number", identificationNumber.replaceAll("\\D", "")
            ));
        }
        return payer;
    }

    private MercadoPagoOrder parseCreatedOrderFromError(RestClientResponseException exception) {
        try {
            return objectMapper.readValue(exception.getResponseBodyAsByteArray(), MercadoPagoOrder.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    private MercadoPagoOrder requireValidOrder(MercadoPagoOrder order) {
        if (order == null || !isOrderId(order.id())) {
            throw new MercadoPagoGatewayException("Mercado Pago retornou uma Order inválida.");
        }
        return order;
    }

    private boolean isOrderId(String id) {
        return id != null && id.toUpperCase(Locale.ROOT).startsWith("ORD");
    }
}
