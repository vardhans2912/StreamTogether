package com.streamtogether.stream.dto;

/**
 * A host's play/pause/seek sent over STOMP.
 *
 * <p>{@code positionAtServerMillis} is the host's own clock translated to server
 * time (see the {@code /app/time} handshake). Passing it through instead of
 * re-stamping on arrival lets viewers subtract the host→server hop as well as
 * their own, which is what keeps convergence inside a second.
 */
public record PlaybackCommand(
        Long mediaId,
        Double currentTimeSeconds,
        Boolean isPlaying,
        Long positionAtServerMillis) {

    public UpdateStateRequest toUpdateStateRequest() {
        return new UpdateStateRequest(mediaId, currentTimeSeconds, isPlaying);
    }
}
