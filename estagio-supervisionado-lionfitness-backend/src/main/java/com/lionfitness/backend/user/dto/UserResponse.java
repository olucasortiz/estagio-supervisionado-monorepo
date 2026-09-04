package com.lionfitness.backend.user.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String role,
        boolean isActive,
        LocalDateTime createdAt,
        String photoUrl
) {
}
