package com.streamtogether.user.controller;

import com.streamtogether.user.dto.CreateProfileRequest;
import com.streamtogether.user.dto.PublicUser;
import com.streamtogether.user.dto.UpdateProfileRequest;
import com.streamtogether.user.exception.ApiException;
import com.streamtogether.user.security.AuthContext;
import com.streamtogether.user.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    // Open (no JWT) — called by auth-service on register.
    @PostMapping("/internal")
    public ResponseEntity<PublicUser> createInternal(@RequestBody CreateProfileRequest request) {
        return ResponseEntity.ok(profileService.createInternal(request));
    }

    // Open (no JWT) — called server-side by other services.
    @GetMapping("/{userId}")
    public ResponseEntity<PublicUser> getProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(profileService.getByUserId(userId));
    }

    // Requires JWT — only the owner may edit.
    @PutMapping("/{userId}")
    public ResponseEntity<PublicUser> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        Long callerId = AuthContext.requireUserId(httpRequest);
        if (!callerId.equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You may only edit your own profile.");
        }
        return ResponseEntity.ok(profileService.update(userId, request));
    }
}
