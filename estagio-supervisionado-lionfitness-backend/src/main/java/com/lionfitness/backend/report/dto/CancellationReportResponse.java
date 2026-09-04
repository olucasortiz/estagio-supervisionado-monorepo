package com.lionfitness.backend.report.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record CancellationReportResponse(
    UUID cancellationId,
    UUID memberId,
    String memberName,
    String memberCpf,
    String reason,
    LocalDate cancellationDate,
    LocalDateTime createdAt
) {}
