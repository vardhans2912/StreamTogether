CREATE TABLE room_media (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    room_id BIGINT NOT NULL,
    added_by_user_id BIGINT NOT NULL,

    media_type VARCHAR(20) NOT NULL, -- VIDEO | AUDIO | YOUTUBE | FILE
    media_url TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_room_media (room_id)
);