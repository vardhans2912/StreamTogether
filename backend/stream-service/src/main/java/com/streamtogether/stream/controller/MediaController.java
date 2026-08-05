package com.streamtogether.stream.controller;

import com.streamtogether.stream.dto.AddMediaRequest;
import com.streamtogether.stream.dto.MediaStateView;
import com.streamtogether.stream.dto.MediaView;
import com.streamtogether.stream.dto.UpdateStateRequest;
import com.streamtogether.stream.realtime.RoomEventPublisher;
import com.streamtogether.stream.security.AuthContext;
import com.streamtogether.stream.service.MediaService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
public class MediaController {

    private final MediaService mediaService;
    private final RoomEventPublisher publisher;

    public MediaController(MediaService mediaService, RoomEventPublisher publisher) {
        this.mediaService = mediaService;
        this.publisher = publisher;
    }

    @GetMapping("/{roomId}/media")
    public ResponseEntity<List<MediaView>> listMedia(
            @PathVariable Long roomId, HttpServletRequest httpRequest) {
        AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(mediaService.listMedia(roomId));
    }

    @PostMapping("/{roomId}/media")
    public ResponseEntity<MediaView> addMedia(
            @PathVariable Long roomId,
            @RequestBody(required = false) AddMediaRequest request,
            HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        MediaView media = mediaService.addMedia(roomId, userId, request);

        // Published after the write commits, never inside it.
        publisher.publishMediaAdded(media);
        // The first item in an empty room also seeds the playback state, so hand
        // out the current state too rather than making clients guess.
        publisher.publishState(mediaService.getState(roomId), userId, null);
        return ResponseEntity.ok(media);
    }

    @GetMapping("/{roomId}/state")
    public ResponseEntity<MediaStateView> getState(
            @PathVariable Long roomId, HttpServletRequest httpRequest) {
        AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(mediaService.getState(roomId));
    }

    /**
     * Kept as the fallback write path for clients whose WebSocket is blocked or
     * still connecting; it fans out over the room topic exactly like the socket
     * path does, so the two cannot drift apart.
     */
    @PutMapping("/{roomId}/state")
    public ResponseEntity<MediaStateView> updateState(
            @PathVariable Long roomId,
            @RequestBody(required = false) UpdateStateRequest request,
            HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        MediaStateView saved = mediaService.updateState(roomId, request);
        publisher.publishState(saved, userId, null);
        return ResponseEntity.ok(saved);
    }
}
