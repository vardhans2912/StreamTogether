package com.streamtogether.stream.dto;

/**
 * Clock handshake over {@code /app/time}. The client echoes its send time; the
 * reply adds the server's, so the client can estimate its offset as
 * {@code serverTimeMillis - (clientSentAtMillis + roundTrip / 2)} and express
 * playback positions on the server's clock.
 */
public final class TimeSync {

    private TimeSync() {
    }

    public record Request(Long clientSentAtMillis) {
    }

    public record Response(Long clientSentAtMillis, Long serverTimeMillis) {
    }
}
