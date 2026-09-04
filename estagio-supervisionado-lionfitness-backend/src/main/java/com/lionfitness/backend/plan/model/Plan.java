package com.lionfitness.backend.plan.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record   Plan(
        UUID id,
        String name,
        PlanType type,
        BigDecimal price,
        int durationDays,
        boolean active,
        LocalDateTime createdAt
) {
}
