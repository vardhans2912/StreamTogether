package com.streamtogether.stream.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamtogether.stream.security.StompAuthChannelInterceptor;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP-over-WebSocket broker. stream-service owns the authoritative playback
 * state, so it is also the realtime hub the SPA holds a single socket to:
 * playback, chat and presence all travel over per-room topics.
 *
 * <ul>
 *   <li>{@code /ws} — handshake endpoint (reached as {@code /media-service/ws}
 *       through the gateway, which proxies the upgrade).</li>
 *   <li>{@code /app/**} — client → server commands, handled by
 *       {@code @MessageMapping} methods.</li>
 *   <li>{@code /topic/rooms/{roomId}/**} — server → client fan-out.</li>
 *   <li>{@code /queue/**} — server → single-client replies.</li>
 * </ul>
 *
 * <p>An in-memory simple broker is enough for a single instance. Scaling out
 * would mean swapping {@code enableSimpleBroker} for a relay (RabbitMQ/ActiveMQ)
 * so subscribers on one node see publishes from another.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /** Keeps idle sockets (and any proxy in between) from being reaped. */
    private static final long HEARTBEAT_MILLIS = 10_000;

    private final StompAuthChannelInterceptor authChannelInterceptor;
    private final ObjectMapper objectMapper;
    private final String[] allowedOrigins;

    public WebSocketConfig(
            StompAuthChannelInterceptor authChannelInterceptor,
            ObjectMapper objectMapper,
            @Value("${streamtogether.realtime.allowed-origins}") String allowedOrigins) {
        this.authChannelInterceptor = authChannelInterceptor;
        this.objectMapper = objectMapper;
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Bean
    public TaskScheduler webSocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOrigins);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] {HEARTBEAT_MILLIS, HEARTBEAT_MILLIS})
                .setTaskScheduler(webSocketHeartbeatScheduler());
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authChannelInterceptor);
    }

    /**
     * Use Boot's configured ObjectMapper rather than the converter's own, so a
     * timestamp on a topic looks exactly like the same timestamp from the REST
     * endpoint (ISO-8601, not epoch seconds). The SPA reads both.
     *
     * <p>Returning false replaces the default converter list instead of adding to it.
     */
    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver contentTypeResolver = new DefaultContentTypeResolver();
        contentTypeResolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setContentTypeResolver(contentTypeResolver);

        messageConverters.add(converter);
        return false;
    }
}
