package com.lionfitness.backend.auth.dto;

import java.util.UUID;

public record AuthUserResponse(
        UUID id,
        String name,
        String email,
        String role
) {
}
