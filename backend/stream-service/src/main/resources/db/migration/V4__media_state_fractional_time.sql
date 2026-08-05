-- Playback positions were whole seconds, so every seek was truncated by up to a
-- second. That was invisible while clients polled every ~3s, but it becomes the
-- dominant error once state is pushed over WebSocket, so store milliseconds.
UPDATE room_media_state SET current_time_seconds = 0 WHERE current_time_seconds IS NULL;

ALTER TABLE room_media_state MODIFY current_time_seconds DECIMAL(12,3) DEFAULT 0;
