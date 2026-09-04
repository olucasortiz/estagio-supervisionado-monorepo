package com.lionfitness.backend.report.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record NewMemberReportResponse(
    UUID memberId,
    String name,
    String cpf,
    String email,
    LocalDateTime createdAt
) {}
