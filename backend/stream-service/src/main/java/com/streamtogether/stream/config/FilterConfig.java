package com.streamtogether.stream.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamtogether.stream.security.JwtAuthFilter;
import com.streamtogether.stream.security.JwtTokenParser;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(
            JwtTokenParser tokenParser, ObjectMapper objectMapper) {
        JwtAuthFilter filter = new JwtAuthFilter(tokenParser, objectMapper);
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
