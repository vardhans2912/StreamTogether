package com.streamtogether.stream.service;

import com.streamtogether.stream.dto.AddMediaRequest;
import com.streamtogether.stream.dto.MediaStateView;
import com.streamtogether.stream.dto.MediaView;
import com.streamtogether.stream.dto.UpdateStateRequest;
import com.streamtogether.stream.exception.ApiException;
import com.streamtogether.stream.repository.MediaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MediaService {

    private final MediaRepository repository;

    public MediaService(MediaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MediaView> listMedia(Long roomId) {
        return repository.findMediaByRoom(roomId);
    }

    @Transactional
    public MediaView addMedia(Long roomId, Long userId, AddMediaRequest request) {
        if (request == null || !StringUtils.hasText(request.mediaUrl())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "mediaUrl is required.");
        }
        String mediaUrl = request.mediaUrl().trim();
        String mediaType = StringUtils.hasText(request.mediaType())
                ? request.mediaType().trim()
                : inferMediaType(mediaUrl);

        MediaView media = repository.insertMedia(roomId, userId, mediaType, mediaUrl);

        // If there is no playback state yet, seed one with this media as current.
        if (!repository.stateExists(roomId)) {
            repository.insertState(roomId, media.id(), 0, false);
        }
        return media;
    }

    @Transactional(readOnly = true)
    public MediaStateView getState(Long roomId) {
        return repository.findState(roomId)
                .orElseGet(() -> transientDefault(roomId));
    }

    @Transactional
    public MediaStateView updateState(Long roomId, UpdateStateRequest request) {
        Optional<MediaStateView> existing = repository.findState(roomId);

        if (existing.isEmpty()) {
            Long mediaId = request != null ? request.mediaId() : null;
            if (mediaId == null) {
                // No row and no media to anchor on: echo transient default, do not persist.
                return transientDefault(roomId);
            }
            double currentTime = clampPosition(request.currentTimeSeconds(), 0);
            boolean isPlaying = request.isPlaying() != null ? request.isPlaying() : false;
            repository.insertState(roomId, mediaId, currentTime, isPlaying);
            return repository.findState(roomId).orElseGet(() -> transientDefault(roomId));
        }

        MediaStateView current = existing.get();
        Long mediaId = request != null && request.mediaId() != null
                ? request.mediaId() : current.mediaId();
        double fallbackTime = current.currentTimeSeconds() != null ? current.currentTimeSeconds() : 0;
        double currentTime = clampPosition(
                request != null ? request.currentTimeSeconds() : null, fallbackTime);
        boolean isPlaying = request != null && request.isPlaying() != null
                ? request.isPlaying()
                : Boolean.TRUE.equals(current.isPlaying());

        repository.updateState(roomId, mediaId, currentTime, isPlaying);
        return repository.findState(roomId).orElseGet(() -> transientDefault(roomId));
    }

    private MediaStateView transientDefault(Long roomId) {
        return new MediaStateView(roomId, null, 0d, false, Instant.now());
    }

    /** A null position means "leave unchanged"; a negative or non-finite one is nonsense. */
    private double clampPosition(Double requested, double fallback) {
        if (requested == null) {
            return fallback;
        }
        if (!Double.isFinite(requested) || requested < 0) {
            return 0;
        }
        return requested;
    }

    private String inferMediaType(String url) {
        String lower = url.toLowerCase();
        if (lower.contains("youtube.com") || lower.contains("youtu.be")) {
            return "YOUTUBE";
        }
        return "VIDEO";
    }
}
