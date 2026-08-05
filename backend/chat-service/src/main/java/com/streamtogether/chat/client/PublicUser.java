package com.streamtogether.chat.client;

public record PublicUser(
        Long id,
        String email,
        String username,
        String displayName,
        String avatarUrl) {
}
