package com.streamtogether.stream.security;

import java.security.Principal;

/**
 * Identity attached to a STOMP session at CONNECT time, derived from the JWT.
 *
 * <p>{@link #getName()} is the user id because Spring keys its {@code /user/**}
 * destinations by principal name.
 */
public record StompPrincipal(Long userId, String username) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
