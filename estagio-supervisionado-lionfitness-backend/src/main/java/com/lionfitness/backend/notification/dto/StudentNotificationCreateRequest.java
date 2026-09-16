package com.lionfitness.backend.notification.dto;

import com.lionfitness.backend.notification.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StudentNotificationCreateRequest(
        @NotNull(message = "Selecione o assunto da mensagem.")
        NotificationType type,
        @NotBlank(message = "Escreva uma mensagem para o seu personal.")
        @Size(max = 2000, message = "A mensagem deve ter no máximo 2000 caracteres.")
        String message
) {
}
