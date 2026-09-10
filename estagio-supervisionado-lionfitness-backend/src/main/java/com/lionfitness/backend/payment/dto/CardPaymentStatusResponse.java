package com.lionfitness.backend.payment.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CardPaymentStatusResponse(
        UUID transactionId,
        String status,
        String message,
        LocalDateTime confirmedAt
) {}
