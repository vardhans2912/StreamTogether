package com.streamtogether.user.dto;

public record CreateProfileRequest(Long userId, String username, String displayName) {
}
