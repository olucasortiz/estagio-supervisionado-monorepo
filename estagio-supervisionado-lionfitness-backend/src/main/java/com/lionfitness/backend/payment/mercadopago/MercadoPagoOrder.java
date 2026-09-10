package com.lionfitness.backend.payment.mercadopago;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoOrder(
        String id,
        String type,
        @JsonProperty("processing_mode") String processingMode,
        @JsonProperty("external_reference") String externalReference,
        @JsonProperty("total_amount") BigDecimal totalAmount,
        String status,
        @JsonProperty("status_detail") String statusDetail,
        Transactions transactions
) {
    public Optional<OrderPayment> firstPayment() {
        if (transactions == null || transactions.payments() == null || transactions.payments().isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(transactions.payments().getFirst());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Transactions(List<OrderPayment> payments) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OrderPayment(
            String id,
            BigDecimal amount,
            @JsonProperty("paid_amount") BigDecimal paidAmount,
            String status,
            @JsonProperty("status_detail") String statusDetail,
            @JsonProperty("expiration_time") String expirationTime,
            @JsonProperty("date_of_expiration") String dateOfExpiration,
            @JsonProperty("payment_method") OrderPaymentMethod paymentMethod
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OrderPaymentMethod(
            String id,
            String type,
            Integer installments,
            @JsonProperty("ticket_url") String ticketUrl,
            @JsonProperty("qr_code") String qrCode,
            @JsonProperty("qr_code_base64") String qrCodeBase64,
            @JsonProperty("transaction_security") TransactionSecurity transactionSecurity
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TransactionSecurity(String id, String type, String status, String url) {}
}
