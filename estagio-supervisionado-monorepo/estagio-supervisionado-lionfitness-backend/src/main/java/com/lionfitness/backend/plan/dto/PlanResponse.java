package com.lionfitness.backend.plan.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.lionfitness.backend.plan.model.PlanType;

public record PlanResponse(
        UUID id,
        String name,
        PlanType type,
        BigDecimal price,
        int durationDays,
        boolean isActive,
        LocalDateTime createdAt
) {
}
