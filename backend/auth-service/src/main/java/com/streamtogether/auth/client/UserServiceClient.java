package com.streamtogether.auth.client;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Defensive HTTP client to user-service, routed through the gateway.
 * Every call degrades gracefully so a user-service hiccup never breaks auth.
 */
@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RestClient restClient;

    public UserServiceClient(RestClient gatewayRestClient) {
        this.restClient = gatewayRestClient;
    }

    /**
     * Create (idempotently) a profile for a freshly-registered user.
     * Best-effort: on failure we just log and continue.
     */
    public void createProfile(Long userId, String username, String displayName) {
        try {
            restClient.post()
                    .uri("/user-service/profiles/internal")
                    .body(Map.of(
                            "userId", userId,
                            "username", username,
                            "displayName", displayName))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to create profile for userId={} via user-service: {}", userId, ex.getMessage());
        }
    }

    /**
     * Fetch a public user profile. Returns null if the call fails or the profile is missing.
     */
    public PublicUser fetchProfile(Long userId) {
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
