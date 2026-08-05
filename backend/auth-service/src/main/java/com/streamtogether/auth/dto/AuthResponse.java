package com.streamtogether.auth.dto;

public record AuthResponse(String token, UserView user) {
}
