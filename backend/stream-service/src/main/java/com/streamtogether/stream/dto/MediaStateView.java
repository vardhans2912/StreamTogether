package com.streamtogether.stream.dto;

import java.time.Instant;

public record MediaStateView(
        Long roomId,
        Long mediaId,
        Double currentTimeSeconds,
        Boolean isPlaying,
        Instant updatedAt) {
}
