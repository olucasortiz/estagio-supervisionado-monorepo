package com.lionfitness.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "E-mail e obrigatorio")
        @Email(message = "E-mail invalido")
        String email
) {
}
