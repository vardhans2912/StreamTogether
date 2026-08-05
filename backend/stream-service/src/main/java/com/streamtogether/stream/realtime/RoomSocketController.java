package com.streamtogether.stream.realtime;

import com.streamtogether.stream.dto.MediaStateView;
import com.streamtogether.stream.dto.PlaybackCommand;
import com.streamtogether.stream.dto.PlaybackStateEvent;
import com.streamtogether.stream.dto.PresenceJoinRequest;
import com.streamtogether.stream.dto.TimeSync;
import com.streamtogether.stream.exception.ErrorResponse;
import com.streamtogether.stream.security.StompPrincipal;
import com.streamtogether.stream.service.MediaService;
import com.streamtogether.stream.service.RoomAuthorizationService;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * The realtime surface of a room. Client frames arrive under {@code /app}; every
 * broadcast goes back out on the room's topics (see {@link RoomTopics}).
 */
@Controller
public class RoomSocketController {

    private static final Logger log = LoggerFactory.getLogger(RoomSocketController.class);

    private final MediaService mediaService;
    private final RoomAuthorizationService roomAuthorization;
    private final PresenceService presenceService;
    private final RoomEventPublisher publisher;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomSocketController(
            MediaService mediaService,
            RoomAuthorizationService roomAuthorization,
            PresenceService presenceService,
            RoomEventPublisher publisher,
            SimpMessagingTemplate messagingTemplate) {
        this.mediaService = mediaService;
        this.roomAuthorization = roomAuthorization;
        this.presenceService = presenceService;
        this.publisher = publisher;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Host play/pause/seek. The state is persisted first and only the persisted
     * result is broadcast, so every client converges on the same row rather than
     * on whatever the host happened to send.
     */
    @MessageMapping("/rooms/{roomId}/state")
    public void updateState(
            @DestinationVariable Long roomId,
            @Payload PlaybackCommand command,
            Principal principal) {

        Long userId = userId(principal);
        if (userId == null) {
            return;
        }
        if (!roomAuthorization.canControlPlayback(roomId, userId)) {
            log.debug("Ignored playback command for room {} from non-host {}", roomId, userId);
            sendError(principal, HttpStatus.FORBIDDEN, "Only the host controls playback.");
            // Re-send the truth so a client that thought it was the host snaps back.
            sendState(principal, mediaService.getState(roomId), null);
            return;
        }

        MediaStateView saved = mediaService.updateState(
                roomId, command != null ? command.toUpdateStateRequest() : null);
        publisher.publishState(
                saved, userId, command != null ? command.positionAtServerMillis() : null);
    }

    /** Late joiners and reconnects ask for the current state instead of polling for it. */
    @MessageMapping("/rooms/{roomId}/sync")
    @SendToUser("/queue/state")
    public PlaybackStateEvent sync(@DestinationVariable Long roomId) {
        return PlaybackStateEvent.of(mediaService.getState(roomId), null, null);
    }

    /**
     * Clock handshake. Positions are exchanged on the server's clock so nobody
     * has to trust anyone else's; this lets a client work out its own offset.
     */
    @MessageMapping("/time")
    @SendToUser("/queue/time")
    public TimeSync.Response time(@Payload(required = false) TimeSync.Request request) {
        return new TimeSync.Response(
                request != null ? request.clientSentAtMillis() : null,
                System.currentTimeMillis());
    }

    @MessageMapping("/rooms/{roomId}/presence/join")
    public void joinPresence(
            @DestinationVariable Long roomId,
            @Payload(required = false) PresenceJoinRequest request,
            Principal principal,
            SimpMessageHeaderAccessor headers) {

        Long userId = userId(principal);
        String sessionId = headers.getSessionId();
        if (userId == null || sessionId == null) {
            return;
        }
        presenceService.join(
                roomId,
                sessionId,
                userId,
                username(principal),
                request != null ? request.displayName() : null,
                request != null ? request.avatarUrl() : null);
        publisher.publishPresence(presenceService.snapshot(roomId));
    }

    @MessageMapping("/rooms/{roomId}/presence/leave")
    public void leavePresence(
            @DestinationVariable Long roomId, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        if (sessionId != null && presenceService.leave(roomId, sessionId)) {
            publisher.publishPresence(presenceService.snapshot(roomId));
        }
    }

    private void sendState(Principal principal, MediaStateView state, Long positionAtServerMillis) {
        messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/state",
                PlaybackStateEvent.of(state, null, positionAtServerMillis));
    }

    private void sendError(Principal principal, HttpStatus status, String message) {
        messagingTemplate.convertAndSendToUser(
                principal.getName(), "/queue/errors", new ErrorResponse(message, status.value()));
    }

    private Long userId(Principal principal) {
        return principal instanceof StompPrincipal stomp ? stomp.userId() : null;
    }

    private String username(Principal principal) {
        return principal instanceof StompPrincipal stomp ? stomp.username() : null;
    }
}
