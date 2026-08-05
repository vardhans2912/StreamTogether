package com.streamtogether.auth.dto;

public record RegisterRequest(String email, String username, String password) {
}
