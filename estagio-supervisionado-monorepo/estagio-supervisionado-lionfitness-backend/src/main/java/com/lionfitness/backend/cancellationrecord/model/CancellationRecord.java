package com.lionfitness.backend.cancellationrecord.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record CancellationRecord(
        UUID id,
        UUID memberId,
        LocalDateTime cancellationDate,
        String reason,
        LocalDateTime createdAt
) {
}
