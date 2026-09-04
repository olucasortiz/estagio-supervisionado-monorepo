package com.lionfitness.backend.cancellationrecord.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CancellationRecordResponse(
        UUID id,
        UUID memberId,
        String memberName,
        String memberCpf,
        LocalDateTime cancellationDate,
        String reason,
        LocalDateTime createdAt
) {
}
