package com.streamtogether.stream.dto;

import java.util.List;

/** Who is in a room right now, broadcast on {@code /topic/rooms/{roomId}/presence}. */
public record PresenceEvent(
        Long roomId,
        int count,
        List<PresentUser> users,
        Long serverTimeMillis) {
}
