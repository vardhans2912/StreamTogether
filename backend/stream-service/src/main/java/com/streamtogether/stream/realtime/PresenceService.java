package com.streamtogether.stream.realtime;

import com.streamtogether.stream.dto.PresenceEvent;
import com.streamtogether.stream.dto.PresentUser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Who is connected to each room, tracked per STOMP session.
 *
 * <p>Deliberately in-memory: presence is true only for the lifetime of a
 * connection, so persisting it would just create rows that outlive their meaning
 * (the durable "who belongs to this room" list is room-service's
 * {@code room_participants}). The cost is that presence is per-instance — with
 * more than one stream-service node each would only see its own sockets, which
 * is the same constraint as the in-memory broker.
 */
@Service
public class PresenceService {

    /** roomId → (stompSessionId → connection). */
    private final Map<Long, Map<String, Connection>> byRoom = new ConcurrentHashMap<>();

    /** stompSessionId → roomIds, so a disconnect can be cleaned up cheaply. */
    private final Map<String, Set<Long>> sessionRooms = new ConcurrentHashMap<>();

    private record Connection(
            Long userId, String username, String displayName, String avatarUrl, long sinceMillis) {
    }

    /** @return true when this changed the room's roster. */
    public boolean join(
            Long roomId,
            String sessionId,
            Long userId,
            String username,
            String displayName,
            String avatarUrl) {
        Connection connection = new Connection(
                userId, username, displayName, avatarUrl, System.currentTimeMillis());
        Connection previous = byRoom
                .computeIfAbsent(roomId, key -> new ConcurrentHashMap<>())
                .put(sessionId, connection);
        sessionRooms
                .computeIfAbsent(sessionId, key -> ConcurrentHashMap.newKeySet())
                .add(roomId);
        return previous == null;
    }

    /** @return true when this changed the room's roster. */
    public boolean leave(Long roomId, String sessionId) {
        Map<String, Connection> connections = byRoom.get(roomId);
        boolean removed = connections != null && connections.remove(sessionId) != null;
        if (connections != null && connections.isEmpty()) {
            byRoom.remove(roomId, connections);
        }
        Set<Long> rooms = sessionRooms.get(sessionId);
        if (rooms != null) {
            rooms.remove(roomId);
            if (rooms.isEmpty()) {
                sessionRooms.remove(sessionId, rooms);
            }
        }
        return removed;
    }

    /** Drops a disconnected session from every room it was in. */
    public List<Long> leaveAll(String sessionId) {
        Set<Long> rooms = sessionRooms.remove(sessionId);
        if (rooms == null || rooms.isEmpty()) {
            return List.of();
        }
        List<Long> affected = new ArrayList<>(rooms.size());
        for (Long roomId : rooms) {
            Map<String, Connection> connections = byRoom.get(roomId);
            if (connections != null && connections.remove(sessionId) != null) {
                affected.add(roomId);
                if (connections.isEmpty()) {
                    byRoom.remove(roomId, connections);
                }
            }
        }
        return affected;
    }

    /**
     * Current roster, collapsed by user so someone with three tabs open counts
     * once (with {@code connections == 3}), ordered by who arrived first.
     */
    public PresenceEvent snapshot(Long roomId) {
        Map<String, Connection> connections = byRoom.get(roomId);
        Map<Long, PresentUser> merged = new LinkedHashMap<>();

        if (connections != null) {
            for (Connection c : connections.values()) {
                merged.merge(
                        c.userId(),
                        new PresentUser(
                                c.userId(), c.username(), c.displayName(), c.avatarUrl(),
                                c.sinceMillis(), 1),
                        (existing, added) -> new PresentUser(
                                existing.userId(),
                                existing.username() != null ? existing.username() : added.username(),
                                existing.displayName() != null
                                        ? existing.displayName() : added.displayName(),
                                existing.avatarUrl() != null
                                        ? existing.avatarUrl() : added.avatarUrl(),
                                Math.min(existing.sinceMillis(), added.sinceMillis()),
                                existing.connections() + added.connections()));
            }
        }

        List<PresentUser> users = new ArrayList<>(merged.values());
        users.sort(Comparator.comparing(PresentUser::sinceMillis));
        return new PresenceEvent(roomId, users.size(), users, System.currentTimeMillis());
    }
}
