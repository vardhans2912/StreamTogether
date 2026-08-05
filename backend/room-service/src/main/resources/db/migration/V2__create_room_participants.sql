CREATE TABLE room_participants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (room_id, user_id),

    CONSTRAINT fk_room_participants_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);