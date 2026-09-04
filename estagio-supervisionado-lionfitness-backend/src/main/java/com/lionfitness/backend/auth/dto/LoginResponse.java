package com.lionfitness.backend.auth.dto;

public record LoginResponse(
        String token,
        AuthUserResponse user
) {
}
