package com.streamtogether.user.security;

import com.streamtogether.user.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;

/**
 * Helper for reading the authenticated principal set by {@link JwtAuthFilter}.
 */
public final class AuthContext {

    private AuthContext() {
    }

    public static Long requireUserId(HttpServletRequest request) {
        Object userId = request.getAttribute(JwtAuthFilter.ATTR_USER_ID);
        if (userId instanceof Long id) {
            return id;
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
    }
}
