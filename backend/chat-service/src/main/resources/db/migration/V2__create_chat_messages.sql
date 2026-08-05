CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    chat_room_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,

    message TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_messages_room
        FOREIGN KEY (chat_room_id)
        REFERENCES chat_rooms(id)
        ON DELETE CASCADE
);