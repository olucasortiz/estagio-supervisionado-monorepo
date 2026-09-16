package com.lionfitness.backend.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotificationReplyRequest(
        @NotBlank(message = "Escreva uma resposta para o aluno.")
        @Size(max = 2000, message = "A resposta deve ter no máximo 2000 caracteres.")
        String message
) {
}
