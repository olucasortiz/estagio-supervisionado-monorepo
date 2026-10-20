package com.lionfitness.backend.notification.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID senderUserId,
        String senderName,
        UUID recipientUserId,
        String type,
        String title,
        String message,
        boolean read,
        LocalDateTime createdAt,
        LocalDateTime readAt,
        boolean fromMe
) {
}
