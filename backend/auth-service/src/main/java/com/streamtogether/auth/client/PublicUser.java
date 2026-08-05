package com.streamtogether.auth.client;

public record PublicUser(
        Long id,
        String email,
        String username,
        String displayName,
        String avatarUrl) {
}
