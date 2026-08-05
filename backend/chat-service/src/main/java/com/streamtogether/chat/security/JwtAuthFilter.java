package com.streamtogether.chat.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamtogether.chat.exception.ErrorResponse;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ATTR_USER_ID = "userId";
    public static final String ATTR_USERNAME = "username";

    private final JwtTokenParser tokenParser;
    private final ObjectMapper objectMapper;

    public JwtAuthFilter(JwtTokenParser tokenParser, ObjectMapper objectMapper) {
        this.tokenParser = tokenParser;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            try {
                Claims claims = tokenParser.parse(token);
                Long userId = Long.parseLong(claims.getSubject());
                request.setAttribute(ATTR_USER_ID, userId);
                Object username = claims.get(ATTR_USERNAME);
                if (username != null) {
                    request.setAttribute(ATTR_USERNAME, username.toString());
                }
            } catch (Exception ex) {
                writeUnauthorized(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = new ErrorResponse("Invalid or expired token.", HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
