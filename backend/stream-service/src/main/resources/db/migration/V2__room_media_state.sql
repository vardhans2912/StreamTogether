CREATE TABLE room_media_state (
    room_id BIGINT PRIMARY KEY,     -- one active state per room

    media_id BIGINT NOT NULL,       -- room_media.id
    current_time_seconds INT DEFAULT 0,
    is_playing BOOLEAN DEFAULT FALSE,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);