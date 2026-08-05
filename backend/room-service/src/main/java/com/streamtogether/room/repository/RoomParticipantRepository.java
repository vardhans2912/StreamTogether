package com.streamtogether.room.repository;

import com.streamtogether.room.entity.RoomParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {

    long countByRoomId(Long roomId);

    boolean existsByRoomIdAndUserId(Long roomId, Long userId);

    Optional<RoomParticipant> findByRoomIdAndUserId(Long roomId, Long userId);

    List<RoomParticipant> findByRoomIdOrderByJoinedAtAscIdAsc(Long roomId);
}
