package com.streamtogether.room.dto;

import java.time.Instant;

public record RoomView(
        Long id,
        String roomCode,
        String roomName,
        Long hostUserId,
        HostView host,
        Boolean isActive,
        Instant createdAt,
        long participantCount) {
}
