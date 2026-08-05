package com.streamtogether.room.dto;

import java.time.Instant;

public record ParticipantView(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        Instant joinedAt,
        boolean isHost) {
}
