package com.streamtogether.chat.dto;

import java.time.Instant;

public record MessageView(
        Long id,
        Long roomId,
        Long senderUserId,
        String senderName,
        String senderUsername,
        String message,
        Instant createdAt) {
}
