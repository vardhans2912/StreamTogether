package com.streamtogether.chat.client;

import com.streamtogether.chat.dto.MessageView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Hands a stored message to stream-service, which holds the room's WebSocket and
 * fans it out on {@code /topic/rooms/{roomId}/chat}.
 *
 * <p>Clients keep one socket, to the realtime hub, so chat-service publishes
 * through it rather than opening a second WebSocket endpoint of its own. This
 * service stays the system of record: the message is validated and committed
 * before it is announced.
 *
 * <p>Best-effort by design — the message is already saved, so a hub hiccup costs
 * liveness (clients see it on their next fetch), not the message.
 */
@Component
public class RealtimeHubClient {

    private static final Logger log = LoggerFactory.getLogger(RealtimeHubClient.class);

    private final RestClient restClient;

    public RealtimeHubClient(RestClient gatewayRestClient) {
        this.restClient = gatewayRestClient;
    }

    public void publishChatMessage(Long roomId, MessageView message) {
        if (roomId == null || message == null) {
            return;
        }
        try {
            restClient.post()
                    .uri("/media-service/internal/rooms/{roomId}/events/chat", roomId)
                    .body(message)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to announce message {} for room {} to the realtime hub: {}",
                    message.id(), roomId, ex.getMessage());
        }
    }
}
