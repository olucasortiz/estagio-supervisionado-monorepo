package com.lionfitness.backend.payment.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record Payment(
        UUID id,
        UUID subscriptionId,
        BigDecimal amount,
        LocalDate paidAt,
        PaymentMethod method,
        PaymentStatus status,
        LocalDateTime createdAt
) {
}
