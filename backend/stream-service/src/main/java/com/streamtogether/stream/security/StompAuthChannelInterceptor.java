package com.streamtogether.stream.security;

import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Authenticates STOMP sessions from the JWT carried on the CONNECT frame.
 *
 * <p>A browser cannot set headers on a WebSocket handshake, so the token travels
 * as a STOMP header on the first frame instead of an HTTP one — the servlet
 * {@link JwtAuthFilter} therefore never sees it. Rejecting here closes the
 * socket before it can subscribe to anything.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenParser tokenParser;

    public StompAuthChannelInterceptor(JwtTokenParser tokenParser) {
        this.tokenParser = tokenParser;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String token = bearerToken(accessor);
        if (token == null) {
            throw new MessageDeliveryException(message, "Authentication required.");
        }

        try {
            Claims claims = tokenParser.parse(token);
            Long userId = Long.parseLong(claims.getSubject());
            Object username = claims.get(JwtAuthFilter.ATTR_USERNAME);
            accessor.setUser(new StompPrincipal(
                    userId, username != null ? username.toString() : null));
        } catch (Exception ex) {
            log.debug("Rejected STOMP CONNECT: {}", ex.getMessage());
            throw new MessageDeliveryException(message, "Invalid or expired token.");
        }

        return message;
    }

    private String bearerToken(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }
}
