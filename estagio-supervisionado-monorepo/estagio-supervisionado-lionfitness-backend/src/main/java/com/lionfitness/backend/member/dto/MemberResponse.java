package com.lionfitness.backend.member.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MemberResponse(
        UUID id,
        UUID userId,
        UUID personalTrainerId,
        UUID activeWorkoutSheetId,
        String name,
        String cpf,
        String email,
        LocalDate birthDate,
        String photoUrl,
        boolean isActive,
        LocalDateTime createdAt
) {
}
