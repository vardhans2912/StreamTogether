package com.streamtogether.stream.controller;

import com.streamtogether.stream.dto.ChatMessagePayload;
import com.streamtogether.stream.realtime.RoomEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets other services push into a room's realtime topics without owning a
 * WebSocket endpoint of their own.
 *
 * <p>Clients hold exactly one socket, to this service, so anything that should
 * appear live has to arrive here. Ownership stays put: chat-service still
 * validates and stores messages, then hands the stored message over for fan-out.
 */
@RestController
@RequestMapping("/internal/rooms")
public class RealtimeEventController {

    private final RoomEventPublisher publisher;

    public RealtimeEventController(RoomEventPublisher publisher) {
        this.publisher = publisher;
    }

    // Open (no JWT) — called server-side by chat-service, same as user-service's
    // /profiles/internal. Not reachable from the browser in any useful way: it
    // only echoes a message onto a topic the caller must already be able to read.
    @PostMapping("/{roomId}/events/chat")
    public ResponseEntity<Void> chatMessage(
            @PathVariable Long roomId, @RequestBody ChatMessagePayload message) {
        publisher.publishChatMessage(roomId, message);
        return ResponseEntity.accepted().build();
    }
}
