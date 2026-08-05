package com.streamtogether.user.dto;

public record PublicUser(
        Long id,
        String email,
        String username,
        String displayName,
        String avatarUrl) {
}
