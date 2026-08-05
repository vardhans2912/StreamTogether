package com.streamtogether.stream.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Defensive HTTP client to room-service, routed through the gateway.
 */
@Component
public class RoomServiceClient {

    private static final Logger log = LoggerFactory.getLogger(RoomServiceClient.class);

    private final RestClient restClient;

    public RoomServiceClient(RestClient gatewayRestClient) {
        this.restClient = gatewayRestClient;
    }

    public RoomSummary fetchRoom(Long roomId) {
        if (roomId == null) {
            return null;
        }
        try {
            return restClient.get()
                    .uri("/room-service/rooms/internal/{roomId}", roomId)
                    .retrieve()
                    .body(RoomSummary.class);
        } catch (Exception ex) {
            log.warn("Failed to fetch room {} via room-service: {}", roomId, ex.getMessage());
            return null;
        }
    }
}
