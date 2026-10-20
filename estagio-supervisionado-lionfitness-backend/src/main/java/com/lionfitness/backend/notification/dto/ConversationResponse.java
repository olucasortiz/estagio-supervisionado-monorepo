package com.lionfitness.backend.notification.dto;

import java.util.List;
import java.util.UUID;

public record ConversationResponse(
        UUID interlocutorUserId,
        String interlocutorName,
        String interlocutorRole,
        UUID memberId,
        List<ChatMessageResponse> messages
) {
}
