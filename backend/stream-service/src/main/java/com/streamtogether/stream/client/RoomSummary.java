package com.streamtogether.stream.client;

/** The slice of a room this service needs: who may drive playback, and is it live. */
public record RoomSummary(Long id, String roomCode, Long hostUserId, Boolean isActive) {
}
