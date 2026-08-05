package com.streamtogether.room.client;

public record PublicUser(
        Long id,
        String email,
        String username,
        String displayName,
        String avatarUrl) {
}
