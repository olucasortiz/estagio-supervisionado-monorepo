package com.lionfitness.backend.notification.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record Notification(
        UUID id,
        UUID recipientUserId,
        UUID senderUserId,
        String senderName,
        NotificationType type,
        String title,
        String message,
        boolean read,
        LocalDateTime createdAt,
        LocalDateTime readAt
) {
}
