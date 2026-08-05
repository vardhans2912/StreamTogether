package com.streamtogether.auth.service;

import com.streamtogether.auth.client.PublicUser;
import com.streamtogether.auth.client.UserServiceClient;
import com.streamtogether.auth.dto.AuthResponse;
import com.streamtogether.auth.dto.LoginRequest;
import com.streamtogether.auth.dto.RegisterRequest;
import com.streamtogether.auth.dto.UserView;
import com.streamtogether.auth.entity.User;
import com.streamtogether.auth.exception.ApiException;
import com.streamtogether.auth.repository.UserRepository;
import com.streamtogether.auth.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserServiceClient userServiceClient;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UserServiceClient userServiceClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userServiceClient = userServiceClient;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request == null
                || !StringUtils.hasText(request.email())
                || !StringUtils.hasText(request.username())
                || !StringUtils.hasText(request.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email, username and password are required.");
        }

        String email = request.email().trim().toLowerCase();
        String username = request.username().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with that email already exists.");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "That username is taken.");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAuthProvider("LOCAL");
        user.setIsActive(Boolean.TRUE);
        user = userRepository.save(user);

        String displayName = username;
        // Best-effort profile creation via user-service.
        userServiceClient.createProfile(user.getId(), username, displayName);

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        UserView view = new UserView(user.getId(), user.getEmail(), user.getUsername(), displayName, null);
        return new AuthResponse(token, view);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request == null
                || !StringUtils.hasText(request.usernameOrEmail())
                || !StringUtils.hasText(request.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Username/email and password are required.");
        }

        String identifier = request.usernameOrEmail().trim();
        User user = userRepository.findByEmailIgnoreCase(identifier.toLowerCase())
                .or(() -> userRepository.findByUsernameIgnoreCase(identifier))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED,
                        "Invalid username/email or password."));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username/email or password.");
        }

        String displayName = user.getUsername();
        String avatarUrl = null;
        PublicUser profile = userServiceClient.fetchProfile(user.getId());
        if (profile != null) {
            if (StringUtils.hasText(profile.displayName())) {
                displayName = profile.displayName();
            }
            avatarUrl = profile.avatarUrl();
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        UserView view = new UserView(user.getId(), user.getEmail(), user.getUsername(), displayName, avatarUrl);
        return new AuthResponse(token, view);
    }
}
