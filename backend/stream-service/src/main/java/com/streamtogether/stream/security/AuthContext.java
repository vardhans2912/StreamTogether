package com.streamtogether.stream.security;

import com.streamtogether.stream.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;

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
