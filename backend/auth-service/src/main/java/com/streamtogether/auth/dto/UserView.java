package com.streamtogether.auth.dto;

public record UserView(
        Long id,
        String email,
        String username,
        String displayName,
        String avatarUrl) {
}
