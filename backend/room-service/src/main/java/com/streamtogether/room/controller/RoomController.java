package com.streamtogether.room.controller;

import com.streamtogether.room.dto.CreateRoomRequest;
import com.streamtogether.room.dto.ParticipantView;
import com.streamtogether.room.dto.RoomSummaryView;
import com.streamtogether.room.dto.RoomView;
import com.streamtogether.room.dto.SuccessResponse;
import com.streamtogether.room.security.AuthContext;
import com.streamtogether.room.service.RoomService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<RoomView> createRoom(
            @RequestBody(required = false) CreateRoomRequest request,
            HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        String roomName = request != null ? request.roomName() : null;
        return ResponseEntity.ok(roomService.createRoom(userId, roomName));
    }

    @GetMapping
    public ResponseEntity<List<RoomView>> listRooms(HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(roomService.listRoomsForUser(userId));
    }

    @GetMapping("/{code}")
    public ResponseEntity<RoomView> getRoom(@PathVariable String code, HttpServletRequest httpRequest) {
        AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(roomService.getByCode(code));
    }

    // Open (no JWT) — called server-side by stream-service to check who the host
    // is before accepting a playback command over the realtime socket.
    @GetMapping("/internal/{roomId}")
    public ResponseEntity<RoomSummaryView> getRoomSummary(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getSummaryById(roomId));
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<RoomView> join(@PathVariable String code, HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(roomService.join(userId, code));
    }

    @GetMapping("/{code}/participants")
    public ResponseEntity<List<ParticipantView>> participants(
            @PathVariable String code, HttpServletRequest httpRequest) {
        AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(roomService.listParticipants(code));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<SuccessResponse> endRoom(@PathVariable String code, HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        roomService.endRoom(userId, code);
        return ResponseEntity.ok(new SuccessResponse(true));
    }
}
