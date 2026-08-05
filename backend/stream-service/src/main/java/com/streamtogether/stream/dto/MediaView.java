package com.streamtogether.stream.dto;

import java.time.Instant;

public record MediaView(
        Long id,
        Long roomId,
        Long addedByUserId,
        String mediaType,
        String mediaUrl,
        Instant createdAt) {
}
