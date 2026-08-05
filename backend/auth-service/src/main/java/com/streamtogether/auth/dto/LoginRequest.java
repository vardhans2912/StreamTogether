package com.streamtogether.auth.dto;

public record LoginRequest(String usernameOrEmail, String password) {
}
