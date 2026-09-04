package com.lionfitness.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
        @NotBlank(message = "Token e obrigatorio")
        String token,

        @NotBlank(message = "Nova senha e obrigatoria")
        String newPassword,

        @NotBlank(message = "Confirmacao de senha e obrigatoria")
        String confirmPassword
) {
}
