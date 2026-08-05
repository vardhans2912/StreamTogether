package com.streamtogether.room.repository;

import com.streamtogether.room.entity.Room;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomCode(String roomCode);

    boolean existsByRoomCode(String roomCode);

    /**
     * Rooms where the given user is the host OR a participant, newest first.
     */
    @Query("""
            SELECT DISTINCT r FROM Room r
            WHERE r.hostUserId = :userId
               OR r.id IN (SELECT p.roomId FROM RoomParticipant p WHERE p.userId = :userId)
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    List<Room> findRoomsForUser(@Param("userId") Long userId);
}
