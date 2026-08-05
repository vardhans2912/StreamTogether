package com.streamtogether.stream.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class StompAuthChannelInterceptorTest {

    private static final String SECRET =
            "test-secret-that-is-long-enough-for-hmac-sha-512-signing-in-tests!!";

    private final SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    private final StompAuthChannelInterceptor interceptor =
            new StompAuthChannelInterceptor(new JwtTokenParser(SECRET));

    @Test
    void attachesTheUserFromAValidTokenOnConnect() {
        StompHeaderAccessor accessor = connectFrame("Bearer " + token(42L, "ana", 60_000));

        interceptor.preSend(message(accessor), null);

        assertThat(accessor.getUser())
                .isEqualTo(new StompPrincipal(42L, "ana"));
    }

    @Test
    void rejectsAConnectWithoutCredentials() {
        StompHeaderAccessor accessor = connectFrame(null);

        assertThatThrownBy(() -> interceptor.preSend(message(accessor), null))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        SecretKey otherKey = Keys.hmacShaKeyFor(
                "a-completely-different-secret-of-sufficient-length-for-hs512!!!!!!"
                        .getBytes(StandardCharsets.UTF_8));
        String foreign = Jwts.builder().subject("42").signWith(otherKey).compact();
        StompHeaderAccessor accessor = connectFrame("Bearer " + foreign);

        assertThatThrownBy(() -> interceptor.preSend(message(accessor), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void rejectsAnExpiredToken() {
        StompHeaderAccessor accessor = connectFrame("Bearer " + token(42L, "ana", -60_000));

        assertThatThrownBy(() -> interceptor.preSend(message(accessor), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void leavesNonConnectFramesAlone() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);

        Message<byte[]> input = message(accessor);
        assertThat(interceptor.preSend(input, null)).isSameAs(input);
        assertThat(accessor.getUser()).isNull();
    }

    private String token(long userId, String username, long expiresInMillis) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .issuedAt(new Date(now - 1000))
                .expiration(new Date(now + expiresInMillis))
                .signWith(key)
                .compact();
    }

    private StompHeaderAccessor connectFrame(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        accessor.setLeaveMutable(true);
        return accessor;
    }

    private Message<byte[]> message(StompHeaderAccessor accessor) {
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
