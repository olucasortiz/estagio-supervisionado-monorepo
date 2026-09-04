package com.lionfitness.backend.subscription.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record Subscription(
        UUID id,
        UUID memberId,
        UUID planId,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        LocalDateTime createdAt
) {
}
