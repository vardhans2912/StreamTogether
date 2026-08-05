package com.streamtogether.user.service;

import com.streamtogether.user.dto.CreateProfileRequest;
import com.streamtogether.user.dto.PublicUser;
import com.streamtogether.user.dto.UpdateProfileRequest;
import com.streamtogether.user.entity.UserProfile;
import com.streamtogether.user.exception.ApiException;
import com.streamtogether.user.repository.UserProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProfileService {

    private final UserProfileRepository repository;

    public ProfileService(UserProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PublicUser createInternal(CreateProfileRequest request) {
        if (request == null || request.userId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        return repository.findByUserId(request.userId())
                .map(this::toPublicUser)
                .orElseGet(() -> {
                    UserProfile profile = new UserProfile();
                    profile.setUserId(request.userId());
                    profile.setUsername(request.username());
                    String displayName = StringUtils.hasText(request.displayName())
                            ? request.displayName()
                            : (StringUtils.hasText(request.username()) ? request.username() : "User");
                    profile.setDisplayName(displayName);
                    return toPublicUser(repository.save(profile));
                });
    }

    @Transactional(readOnly = true)
    public PublicUser getByUserId(Long userId) {
        return repository.findByUserId(userId)
                .map(this::toPublicUser)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found."));
    }

    @Transactional
    public PublicUser update(Long userId, UpdateProfileRequest request) {
        UserProfile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found."));

        if (request != null) {
            if (request.displayName() != null && StringUtils.hasText(request.displayName())) {
                profile.setDisplayName(request.displayName());
            }
            if (request.avatarUrl() != null) {
                profile.setAvatarUrl(request.avatarUrl());
            }
        }
        return toPublicUser(repository.save(profile));
    }

    private PublicUser toPublicUser(UserProfile profile) {
        // Public-user shape consumed by other services: email is null here.
        return new PublicUser(
                profile.getUserId(),
                null,
                profile.getUsername(),
                profile.getDisplayName(),
                profile.getAvatarUrl());
    }
}
