package com.streamtogether.stream.dto;

/**
 * The authoritative playback state, as broadcast on
 * {@code /topic/rooms/{roomId}/state}.
 */
public record PlaybackStateEvent(
        Long roomId,
        Long mediaId,
        Double currentTimeSeconds,
        Boolean isPlaying,
        /* Server-clock instant at which currentTimeSeconds was measured. */
        Long positionAtServerMillis,
        /* Server clock at publish time — lets clients estimate delivery lag. */
        Long serverTimeMillis,
        Long updatedByUserId) {

    public static PlaybackStateEvent of(
            MediaStateView state, Long updatedByUserId, Long positionAtServerMillis) {
        long now = System.currentTimeMillis();
        return new PlaybackStateEvent(
                state.roomId(),
                state.mediaId(),
                state.currentTimeSeconds(),
                state.isPlaying(),
                positionAtServerMillis != null ? positionAtServerMillis : now,
                now,
                updatedByUserId);
    }
}
