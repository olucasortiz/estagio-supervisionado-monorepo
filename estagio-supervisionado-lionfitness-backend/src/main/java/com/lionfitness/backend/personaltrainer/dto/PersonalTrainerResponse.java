package com.lionfitness.backend.personaltrainer.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PersonalTrainerResponse(
        UUID id,
        UUID userId,
        String name,
        String cpf,
        String email,
        String phone,
        String specialty,
        boolean isActive,
        LocalDateTime createdAt,
        String photoUrl
) {
}
