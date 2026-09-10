package com.lionfitness.backend.payment.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OnlinePaymentTransaction(
        UUID id,
        UUID subscriptionId,
        UUID paymentId,
        String transactionIdentifier,
        BigDecimal amount,
        LocalDateTime requestedAt,
        LocalDateTime confirmedAt,
        String status,
        String gatewayReturn,
        String idempotencyKey
) {
    public OnlinePaymentTransaction(
            UUID id,
            UUID subscriptionId,
            UUID paymentId,
            String transactionIdentifier,
            BigDecimal amount,
            LocalDateTime requestedAt,
            LocalDateTime confirmedAt,
            String status,
            String gatewayReturn
    ) {
        this(id, subscriptionId, paymentId, transactionIdentifier, amount, requestedAt,
                confirmedAt, status, gatewayReturn, null);
    }
}
