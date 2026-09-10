package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PixGenerateResponse(
        UUID transactionId,
        UUID subscriptionId,
        UUID paymentId,
        String transactionIdentifier,
        BigDecimal amount,
        String status,
        String qrCodePayload,
        String qrCodeBase64,
        String ticketUrl,
        String externalTransactionId,
        LocalDateTime requestedAt
) {
}

