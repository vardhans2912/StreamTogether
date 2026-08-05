package com.streamtogether.stream.dto;

/**
 * One person currently connected to a room. {@code connections} is greater than
 * one when someone has the room open in several tabs.
 */
public record PresentUser(
        Long userId,
        String username,
        String displayName,
        String avatarUrl,
        Long sinceMillis,
        int connections) {
}
