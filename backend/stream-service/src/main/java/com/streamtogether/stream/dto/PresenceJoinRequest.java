package com.streamtogether.stream.dto;

/**
 * Optional decoration a client sends when announcing itself. Identity (user id,
 * username) always comes from the JWT — never from this payload.
 */
public record PresenceJoinRequest(String displayName, String avatarUrl) {
}
