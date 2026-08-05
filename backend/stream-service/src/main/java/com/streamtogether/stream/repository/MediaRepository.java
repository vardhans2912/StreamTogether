package com.streamtogether.stream.repository;

import com.streamtogether.stream.dto.MediaStateView;
import com.streamtogether.stream.dto.MediaView;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MediaRepository {

    private final JdbcTemplate jdbc;

    public MediaRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<MediaView> MEDIA_MAPPER = (rs, rowNum) -> new MediaView(
            rs.getLong("id"),
            rs.getLong("room_id"),
            rs.getLong("added_by_user_id"),
            rs.getString("media_type"),
            rs.getString("media_url"),
            toInstant(rs.getTimestamp("created_at")));

    private static final RowMapper<MediaStateView> STATE_MAPPER = (rs, rowNum) -> {
        long mediaIdRaw = rs.getLong("media_id");
        Long mediaId = rs.wasNull() ? null : mediaIdRaw;
        return new MediaStateView(
                rs.getLong("room_id"),
                mediaId,
                rs.getDouble("current_time_seconds"),
                rs.getBoolean("is_playing"),
                toInstant(rs.getTimestamp("updated_at")));
    };

    private static Instant toInstant(Timestamp ts) {
        return ts != null ? ts.toInstant() : null;
    }

    // ---- room_media ----

    public List<MediaView> findMediaByRoom(Long roomId) {
        return jdbc.query(
                "SELECT id, room_id, added_by_user_id, media_type, media_url, created_at "
                        + "FROM room_media WHERE room_id = ? ORDER BY created_at ASC, id ASC",
                MEDIA_MAPPER, roomId);
    }

    public MediaView insertMedia(Long roomId, Long addedByUserId, String mediaType, String mediaUrl) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO room_media (room_id, added_by_user_id, media_type, media_url) "
                            + "VALUES (?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, roomId);
            ps.setLong(2, addedByUserId);
            ps.setString(3, mediaType);
            ps.setString(4, mediaUrl);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long id = key != null ? key.longValue() : 0L;
        return jdbc.queryForObject(
                "SELECT id, room_id, added_by_user_id, media_type, media_url, created_at "
                        + "FROM room_media WHERE id = ?",
                MEDIA_MAPPER, id);
    }

    // ---- room_media_state ----

    public Optional<MediaStateView> findState(Long roomId) {
        List<MediaStateView> rows = jdbc.query(
                "SELECT room_id, media_id, current_time_seconds, is_playing, updated_at "
                        + "FROM room_media_state WHERE room_id = ?",
                STATE_MAPPER, roomId);
        return rows.stream().findFirst();
    }

    public boolean stateExists(Long roomId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM room_media_state WHERE room_id = ?", Integer.class, roomId);
        return count != null && count > 0;
    }

    public void insertState(Long roomId, Long mediaId, double currentTimeSeconds, boolean isPlaying) {
        jdbc.update(
                "INSERT INTO room_media_state (room_id, media_id, current_time_seconds, is_playing) "
                        + "VALUES (?, ?, ?, ?)",
                roomId, mediaId, currentTimeSeconds, isPlaying);
    }

    public void updateState(Long roomId, Long mediaId, double currentTimeSeconds, boolean isPlaying) {
        jdbc.update(
                "UPDATE room_media_state SET media_id = ?, current_time_seconds = ?, is_playing = ?, "
                        + "updated_at = CURRENT_TIMESTAMP WHERE room_id = ?",
                mediaId, currentTimeSeconds, isPlaying, roomId);
    }
}
