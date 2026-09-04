package com.lionfitness.backend.user.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record User(
        UUID id,
        String name,
        String email,
        String passwordHash,
        String role,
        boolean active,
        LocalDateTime createdAt,
        boolean hasPhoto
) {
}
