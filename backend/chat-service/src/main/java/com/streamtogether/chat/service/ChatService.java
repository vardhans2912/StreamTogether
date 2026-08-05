package com.streamtogether.chat.service;

import com.streamtogether.chat.client.PublicUser;
import com.streamtogether.chat.client.UserServiceClient;
import com.streamtogether.chat.dto.MessageView;
import com.streamtogether.chat.entity.ChatMessage;
import com.streamtogether.chat.entity.ChatRoom;
import com.streamtogether.chat.exception.ApiException;
import com.streamtogether.chat.repository.ChatMessageRepository;
import com.streamtogether.chat.repository.ChatRoomRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ChatService {

    private static final String FALLBACK_NAME = "Unknown";
    private static final String FALLBACK_USERNAME = "unknown";

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserServiceClient userServiceClient;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            UserServiceClient userServiceClient) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userServiceClient = userServiceClient;
    }

    @Transactional(readOnly = true)
    public List<MessageView> getMessages(Long roomId) {
        ChatRoom chatRoom = chatRoomRepository.findByRoomId(roomId).orElse(null);
        if (chatRoom == null) {
            return List.of();
        }
        List<ChatMessage> messages =
                chatMessageRepository.findByChatRoomIdOrderByCreatedAtAscIdAsc(chatRoom.getId());

        Map<Long, PublicUser> cache = new HashMap<>();
        List<MessageView> views = new ArrayList<>(messages.size());
        for (ChatMessage m : messages) {
            views.add(decorate(m, roomId, cache));
        }
        return views;
    }

    @Transactional
    public MessageView sendMessage(Long roomId, Long senderUserId, String message) {
        if (!StringUtils.hasText(message)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message must not be blank.");
        }
        ChatRoom chatRoom = findOrCreateChatRoom(roomId);

        ChatMessage entity = new ChatMessage();
        entity.setChatRoomId(chatRoom.getId());
        entity.setSenderUserId(senderUserId);
        entity.setMessage(message.trim());
        entity = chatMessageRepository.save(entity);

        return decorate(entity, roomId, new HashMap<>());
    }

    private ChatRoom findOrCreateChatRoom(Long roomId) {
        return chatRoomRepository.findByRoomId(roomId).orElseGet(() -> {
            try {
                ChatRoom created = new ChatRoom();
                created.setRoomId(roomId);
                return chatRoomRepository.save(created);
            } catch (DataIntegrityViolationException ex) {
                // Concurrent create; fall back to the existing row.
                return chatRoomRepository.findByRoomId(roomId)
                        .orElseThrow(() -> ex);
            }
        });
    }

    private MessageView decorate(ChatMessage message, Long roomId, Map<Long, PublicUser> cache) {
        Long senderId = message.getSenderUserId();
        // Cache within the request, including null results, to avoid duplicate calls.
        if (!cache.containsKey(senderId)) {
            cache.put(senderId, userServiceClient.fetchProfile(senderId));
        }
        PublicUser user = cache.get(senderId);

        String senderName = FALLBACK_NAME;
        String senderUsername = FALLBACK_USERNAME;
        if (user != null) {
            if (StringUtils.hasText(user.displayName())) {
                senderName = user.displayName();
            }
            if (StringUtils.hasText(user.username())) {
                senderUsername = user.username();
            }
        }

        return new MessageView(
                message.getId(),
                roomId,
                message.getSenderUserId(),
                senderName,
                senderUsername,
                message.getMessage(),
                message.getCreatedAt());
    }
}
