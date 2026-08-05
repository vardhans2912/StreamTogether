package com.streamtogether.stream.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import com.streamtogether.stream.dto.PresenceEvent;
import com.streamtogether.stream.dto.PresentUser;
import java.util.List;
import org.junit.jupiter.api.Test;

class PresenceServiceTest {

    private final PresenceService presenceService = new PresenceService();

    @Test
    void collapsesMultipleTabsOfTheSameUserIntoOneEntry() {
        presenceService.join(7L, "session-a", 1L, "ana", "Ana", null);
        presenceService.join(7L, "session-b", 1L, "ana", "Ana", null);
        presenceService.join(7L, "session-c", 2L, "bo", "Bo", null);

        PresenceEvent snapshot = presenceService.snapshot(7L);

        assertThat(snapshot.count()).isEqualTo(2);
        assertThat(snapshot.users())
                .extracting(PresentUser::userId, PresentUser::connections)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(1L, 2),
                        org.assertj.core.groups.Tuple.tuple(2L, 1));
    }

    @Test
    void keepsUserPresentUntilTheirLastConnectionGoes() {
        presenceService.join(7L, "session-a", 1L, "ana", "Ana", null);
        presenceService.join(7L, "session-b", 1L, "ana", "Ana", null);

        presenceService.leave(7L, "session-a");
        assertThat(presenceService.snapshot(7L).count()).isEqualTo(1);

        presenceService.leave(7L, "session-b");
        assertThat(presenceService.snapshot(7L).count()).isZero();
    }

    @Test
    void aDisconnectClearsTheSessionFromEveryRoomItWasIn() {
        presenceService.join(7L, "session-a", 1L, "ana", "Ana", null);
        presenceService.join(9L, "session-a", 1L, "ana", "Ana", null);
        presenceService.join(9L, "session-b", 2L, "bo", "Bo", null);

        List<Long> affected = presenceService.leaveAll("session-a");

        assertThat(affected).containsExactlyInAnyOrder(7L, 9L);
        assertThat(presenceService.snapshot(7L).count()).isZero();
        assertThat(presenceService.snapshot(9L).users())
                .extracting(PresentUser::userId)
                .containsExactly(2L);
    }

    @Test
    void snapshotOfAnUnknownRoomIsEmptyRatherThanNull() {
        PresenceEvent snapshot = presenceService.snapshot(404L);

        assertThat(snapshot.roomId()).isEqualTo(404L);
        assertThat(snapshot.count()).isZero();
        assertThat(snapshot.users()).isEmpty();
    }

    @Test
    void reportsWhetherTheRosterActuallyChanged() {
        assertThat(presenceService.join(7L, "session-a", 1L, "ana", "Ana", null)).isTrue();
        // Same session announcing itself again is a no-op for the roster.
        assertThat(presenceService.join(7L, "session-a", 1L, "ana", "Ana", null)).isFalse();
        assertThat(presenceService.leave(7L, "session-a")).isTrue();
        assertThat(presenceService.leave(7L, "session-a")).isFalse();
    }
}
