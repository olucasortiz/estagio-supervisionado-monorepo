package com.lionfitness.backend.subscription.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MySubscriptionResponse(
        UUID id,
        UUID memberId,
        UUID planId,
        String planName,
        String planType,
        BigDecimal planPrice,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        LocalDateTime createdAt,
        Integer daysRemaining,
        Boolean hasSubscription
) {
}
