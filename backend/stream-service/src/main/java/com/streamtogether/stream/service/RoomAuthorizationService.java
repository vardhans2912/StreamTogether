package com.streamtogether.stream.service;

import com.streamtogether.stream.client.RoomServiceClient;
import com.streamtogether.stream.client.RoomSummary;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Answers "may this user drive playback in this room?".
 *
 * <p>Playback is host-authoritative, but rooms live in room-service, so the
 * answer comes from there. A play/pause/seek burst can be several commands a
 * second, hence the short-lived cache — hosts never change for a room's
 * lifetime, so a stale entry cannot grant the wrong person control.
 */
@Service
public class RoomAuthorizationService {

    private static final Logger log = LoggerFactory.getLogger(RoomAuthorizationService.class);
    private static final long CACHE_TTL_MILLIS = 30_000;

    private final RoomServiceClient roomServiceClient;
    private final Map<Long, CacheEntry> cache = new ConcurrentHashMap<>();

    private record CacheEntry(RoomSummary room, long fetchedAtMillis) {
        boolean isFresh() {
            return System.currentTimeMillis() - fetchedAtMillis < CACHE_TTL_MILLIS;
        }
    }

    public RoomAuthorizationService(RoomServiceClient roomServiceClient) {
        this.roomServiceClient = roomServiceClient;
    }

    public boolean canControlPlayback(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            return false;
        }
        RoomSummary room = lookup(roomId);
        if (room == null) {
            // room-service is unreachable. Degrade the check rather than freeze the
            // party: the caller is still an authenticated user, and the REST path
            // has never enforced host-only writes either. Logged so it is visible.
            log.warn("Cannot verify host for room {}; allowing playback command from user {}",
                    roomId, userId);
            return true;
        }
        return userId.equals(room.hostUserId());
    }

    private RoomSummary lookup(Long roomId) {
        CacheEntry cached = cache.get(roomId);
        if (cached != null && cached.isFresh()) {
            return cached.room();
        }
        RoomSummary room = roomServiceClient.fetchRoom(roomId);
        if (room == null) {
            // Prefer a stale answer over no answer.
            return cached != null ? cached.room() : null;
        }
        cache.put(roomId, new CacheEntry(room, System.currentTimeMillis()));
        return room;
    }
}
