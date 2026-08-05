package com.streamtogether.room.service;

import com.streamtogether.room.client.PublicUser;
import com.streamtogether.room.client.UserServiceClient;
import com.streamtogether.room.dto.HostView;
import com.streamtogether.room.dto.ParticipantView;
import com.streamtogether.room.dto.RoomSummaryView;
import com.streamtogether.room.dto.RoomView;
import com.streamtogether.room.entity.Room;
import com.streamtogether.room.entity.RoomParticipant;
import com.streamtogether.room.exception.ApiException;
import com.streamtogether.room.repository.RoomParticipantRepository;
import com.streamtogether.room.repository.RoomRepository;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class RoomService {

    private static final String CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final int MAX_CODE_ATTEMPTS = 20;

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserServiceClient userServiceClient;
    private final SecureRandom random = new SecureRandom();

    public RoomService(
            RoomRepository roomRepository,
            RoomParticipantRepository participantRepository,
            UserServiceClient userServiceClient) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.userServiceClient = userServiceClient;
    }

    @Transactional
    public RoomView createRoom(Long userId, String roomName) {
        if (!StringUtils.hasText(roomName)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Room name is required.");
        }

        Room room = new Room();
        room.setRoomCode(generateUniqueCode());
        room.setHostUserId(userId);
        room.setRoomName(roomName.trim());
        room.setIsActive(Boolean.TRUE);
        room = roomRepository.save(room);

        RoomParticipant hostParticipant = new RoomParticipant();
        hostParticipant.setRoomId(room.getId());
        hostParticipant.setUserId(userId);
        participantRepository.save(hostParticipant);

        return toRoomView(room);
    }

    @Transactional(readOnly = true)
    public List<RoomView> listRoomsForUser(Long userId) {
        return roomRepository.findRoomsForUser(userId).stream()
                .map(this::toRoomView)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomView getByCode(String code) {
        return toRoomView(requireRoom(code));
    }

    /**
     * Lookup by id for other services. stream-service holds the realtime socket
     * and needs to know who the host is before it accepts a playback command,
     * and it only ever knows a room by its id.
     */
    @Transactional(readOnly = true)
    public RoomSummaryView getSummaryById(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Room not found."));
        return new RoomSummaryView(
                room.getId(), room.getRoomCode(), room.getHostUserId(), room.getIsActive());
    }

    @Transactional
    public RoomView join(Long userId, String code) {
        Room room = requireRoom(code);
        if (!Boolean.TRUE.equals(room.getIsActive())) {
            throw new ApiException(HttpStatus.GONE, "This room has ended.");
        }
        if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            RoomParticipant participant = new RoomParticipant();
            participant.setRoomId(room.getId());
            participant.setUserId(userId);
            participantRepository.save(participant);
        }
        return toRoomView(room);
    }

    @Transactional(readOnly = true)
    public List<ParticipantView> listParticipants(String code) {
        Room room = requireRoom(code);
        List<RoomParticipant> participants =
                participantRepository.findByRoomIdOrderByJoinedAtAscIdAsc(room.getId());

        List<ParticipantView> views = new ArrayList<>(participants.size());
        for (RoomParticipant p : participants) {
            PublicUser user = userServiceClient.fetchProfile(p.getUserId());
            String username = user != null ? user.username() : null;
            String displayName = user != null ? user.displayName() : null;
            String avatarUrl = user != null ? user.avatarUrl() : null;
            views.add(new ParticipantView(
                    p.getUserId(),
                    username,
                    displayName,
                    avatarUrl,
                    p.getJoinedAt(),
                    p.getUserId().equals(room.getHostUserId())));
        }
        return views;
    }

    @Transactional
    public void endRoom(Long userId, String code) {
        Room room = requireRoom(code);
        if (!room.getHostUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the host may end this room.");
        }
        room.setIsActive(Boolean.FALSE);
        roomRepository.save(room);
    }

    private Room requireRoom(String code) {
        return roomRepository.findByRoomCode(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Room not found."));
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = randomCode();
            if (!roomRepository.existsByRoomCode(code)) {
                return code;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not allocate a room code, please retry.");
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private RoomView toRoomView(Room room) {
        long participantCount = participantRepository.countByRoomId(room.getId());
        HostView host = null;
        PublicUser hostUser = userServiceClient.fetchProfile(room.getHostUserId());
        if (hostUser != null) {
            host = new HostView(
                    hostUser.id(),
                    hostUser.username(),
                    hostUser.displayName(),
                    hostUser.avatarUrl());
        }
        return new RoomView(
                room.getId(),
                room.getRoomCode(),
                room.getRoomName(),
                room.getHostUserId(),
                host,
                room.getIsActive(),
                room.getCreatedAt(),
                participantCount);
    }
}
