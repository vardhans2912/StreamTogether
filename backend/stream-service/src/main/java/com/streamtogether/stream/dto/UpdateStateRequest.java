package com.streamtogether.stream.dto;

public record UpdateStateRequest(
        Long mediaId,
        Double currentTimeSeconds,
        Boolean isPlaying) {
}
