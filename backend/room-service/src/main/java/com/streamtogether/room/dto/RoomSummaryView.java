package com.streamtogether.room.dto;

/**
 * Minimal room facts for service-to-service lookups by id.
 *
 * <p>Deliberately narrower than {@link RoomView}: no host profile enrichment, so
 * answering it costs one query and never fans out to user-service.
 */
public record RoomSummaryView(Long id, String roomCode, Long hostUserId, Boolean isActive) {
}
