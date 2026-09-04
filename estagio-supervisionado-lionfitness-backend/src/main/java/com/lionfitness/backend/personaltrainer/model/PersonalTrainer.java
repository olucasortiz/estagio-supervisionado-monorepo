package com.lionfitness.backend.personaltrainer.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record PersonalTrainer(
        UUID id,
        UUID userId,
        String name,
        String cpf,
        String email,
        String phone,
        String specialty,
        boolean active,
        LocalDateTime createdAt,
        String photoUrl
) {
}
