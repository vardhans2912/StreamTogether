package com.streamtogether.stream.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * A closed tab, a dropped network or a killed browser all surface as a
 * disconnect rather than a polite "leave", so presence is reconciled here.
 */
@Component
public class StompSessionListener {

    private static final Logger log = LoggerFactory.getLogger(StompSessionListener.class);

    private final PresenceService presenceService;
    private final RoomEventPublisher publisher;

    public StompSessionListener(PresenceService presenceService, RoomEventPublisher publisher) {
        this.presenceService = presenceService;
        this.publisher = publisher;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (sessionId == null) {
            return;
        }
        for (Long roomId : presenceService.leaveAll(sessionId)) {
            log.debug("Session {} dropped out of room {}", sessionId, roomId);
            publisher.publishPresence(presenceService.snapshot(roomId));
        }
    }
}
