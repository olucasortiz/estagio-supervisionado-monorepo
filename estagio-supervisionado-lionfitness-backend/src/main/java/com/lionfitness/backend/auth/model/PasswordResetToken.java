package com.lionfitness.backend.auth.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record PasswordResetToken(
        UUID id,
        UUID userId,
        String token,
        LocalDateTime expiresAt,
        boolean used,
        LocalDateTime createdAt
) {
}
