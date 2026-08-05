package com.streamtogether.stream.realtime;

import com.streamtogether.stream.dto.ChatMessagePayload;
import com.streamtogether.stream.dto.MediaStateView;
import com.streamtogether.stream.dto.MediaView;
import com.streamtogether.stream.dto.PlaybackStateEvent;
import com.streamtogether.stream.dto.PresenceEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Fan-out to a room's topics.
 *
 * <p>Every publish is best-effort: a broker problem must never fail the write
 * that triggered it, because the state is already committed and clients still
 * reconcile over REST. Callers publish <em>after</em> their transaction commits,
 * so nobody ever sees a state that was later rolled back.
 */
@Component
public class RoomEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RoomEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public RoomEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishState(MediaStateView state, Long updatedByUserId, Long positionAtServerMillis) {
        if (state == null || state.roomId() == null) {
            return;
        }
        send(RoomTopics.state(state.roomId()),
                PlaybackStateEvent.of(state, updatedByUserId, positionAtServerMillis));
    }

    public void publishMediaAdded(MediaView media) {
        if (media == null || media.roomId() == null) {
            return;
        }
        send(RoomTopics.media(media.roomId()), media);
    }

    public void publishChatMessage(Long roomId, ChatMessagePayload message) {
        send(RoomTopics.chat(roomId), message);
    }

    public void publishPresence(PresenceEvent presence) {
        if (presence == null || presence.roomId() == null) {
            return;
        }
        send(RoomTopics.presence(presence.roomId()), presence);
    }

    private void send(String destination, Object payload) {
        try {
            messagingTemplate.convertAndSend(destination, payload);
        } catch (Exception ex) {
            log.warn("Failed to publish to {}: {}", destination, ex.getMessage());
        }
    }
}
