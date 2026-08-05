package com.streamtogether.stream.dto;

import java.time.Instant;

/**
 * A chat message handed to the hub by chat-service (which remains the system of
 * record) for fan-out on {@code /topic/rooms/{roomId}/chat}. Field-for-field
 * chat-service's {@code MessageView} so the SPA sees one shape either way.
 */
public record ChatMessagePayload(
        Long id,
        Long roomId,
        Long senderUserId,
        String senderName,
        String senderUsername,
        String message,
        Instant createdAt) {
}
