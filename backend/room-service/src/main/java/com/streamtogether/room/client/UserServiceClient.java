package com.streamtogether.room.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Defensive HTTP client to user-service, routed through the gateway.
 */
@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RestClient restClient;

    public UserServiceClient(RestClient gatewayRestClient) {
        this.restClient = gatewayRestClient;
    }

    /**
     * Fetch a public user profile. Returns null if the call fails or the profile is missing.
     */
    public PublicUser fetchProfile(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            return restClient.get()
                    .uri("/user-service/profiles/{userId}", userId)
                    .retrieve()
                    .body(PublicUser.class);
        } catch (Exception ex) {
            log.warn("Failed to fetch profile for userId={} via user-service: {}", userId, ex.getMessage());
            return null;
        }
    }
}
