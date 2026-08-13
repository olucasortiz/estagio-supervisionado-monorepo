package com.lionfitness.backend.member.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record Member(
        UUID id,
        UUID userId,
        UUID personalTrainerId,
        String name,
        String cpf,
        String email,
        LocalDate birthDate,
        String photoUrl,
        boolean active,
        LocalDateTime createdAt
) {
}
