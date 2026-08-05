package com.streamtogether.chat.controller;

import com.streamtogether.chat.client.RealtimeHubClient;
import com.streamtogether.chat.dto.MessageView;
import com.streamtogether.chat.dto.SendMessageRequest;
import com.streamtogether.chat.security.AuthContext;
import com.streamtogether.chat.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/rooms")
public class ChatController {

    private final ChatService chatService;
    private final RealtimeHubClient realtimeHubClient;

    public ChatController(ChatService chatService, RealtimeHubClient realtimeHubClient) {
        this.chatService = chatService;
        this.realtimeHubClient = realtimeHubClient;
    }

    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<MessageView>> getMessages(
            @PathVariable Long roomId, HttpServletRequest httpRequest) {
        AuthContext.requireUserId(httpRequest);
        return ResponseEntity.ok(chatService.getMessages(roomId));
    }

    @PostMapping("/{roomId}/messages")
    public ResponseEntity<MessageView> sendMessage(
            @PathVariable Long roomId,
            @RequestBody(required = false) SendMessageRequest request,
            HttpServletRequest httpRequest) {
        Long userId = AuthContext.requireUserId(httpRequest);
        String message = request != null ? request.message() : null;
        MessageView created = chatService.sendMessage(roomId, userId, message);

        // Announced only once it is committed, so nobody sees a message that
        // never made it into chat_messages.
        realtimeHubClient.publishChatMessage(roomId, created);
        return ResponseEntity.ok(created);
    }
}
