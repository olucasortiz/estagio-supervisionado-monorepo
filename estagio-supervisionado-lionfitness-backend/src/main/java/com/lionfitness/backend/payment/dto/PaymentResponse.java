package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;

public record PaymentResponse(
        UUID id,
        UUID subscriptionId,
        BigDecimal amount,
        LocalDate paidAt,
        PaymentMethod method,
        PaymentStatus status,
        LocalDateTime createdAt
) {
}
