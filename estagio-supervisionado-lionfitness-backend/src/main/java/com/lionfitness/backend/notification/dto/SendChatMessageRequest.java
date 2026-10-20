package com.lionfitness.backend.notification.dto;

import java.util.UUID;

import com.lionfitness.backend.notification.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(
        UUID memberId,
        @NotBlank(message = "A mensagem não pode ser vazia.")
        @Size(max = 2000, message = "A mensagem deve ter no máximo 2000 caracteres.")
        String message,
        NotificationType type
) {
}
