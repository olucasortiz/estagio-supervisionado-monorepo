package com.lionfitness.backend.payment.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PixConfirmResponse(
        UUID transactionId,
        UUID paymentId,
        String transactionIdentifier,
        String status,
        String message,
        LocalDateTime confirmedAt
) {
}
