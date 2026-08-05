package com.streamtogether.stream.realtime;

/**
 * Destinations are namespaced per room so a client only receives traffic for the
 * party it is actually watching — the broker does the filtering, not the client.
 */
public final class RoomTopics {

    private static final String ROOM_PREFIX = "/topic/rooms/";

    private RoomTopics() {
    }

    public static String state(Long roomId) {
        return ROOM_PREFIX + roomId + "/state";
    }

    public static String chat(Long roomId) {
        return ROOM_PREFIX + roomId + "/chat";
    }

    public static String presence(Long roomId) {
        return ROOM_PREFIX + roomId + "/presence";
    }

    public static String media(Long roomId) {
        return ROOM_PREFIX + roomId + "/media";
    }
}
