package com.streamtogether.room.dto;

public record HostView(
        Long id,
        String username,
        String displayName,
        String avatarUrl) {
}
