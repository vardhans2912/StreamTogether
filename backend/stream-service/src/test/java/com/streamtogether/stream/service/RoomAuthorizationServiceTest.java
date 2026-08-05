package com.streamtogether.stream.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.streamtogether.stream.client.RoomServiceClient;
import com.streamtogether.stream.client.RoomSummary;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class RoomAuthorizationServiceTest {

    /** Stub over the real client so no HTTP (or gateway) is involved. */
    private static class StubRoomServiceClient extends RoomServiceClient {
        private final AtomicInteger calls = new AtomicInteger();
        private final RoomSummary answer;

        StubRoomServiceClient(RoomSummary answer) {
            super(null);
            this.answer = answer;
        }

        @Override
        public RoomSummary fetchRoom(Long roomId) {
            calls.incrementAndGet();
            return answer;
        }
    }

    @Test
    void theHostMayDrivePlayback() {
        var client = new StubRoomServiceClient(new RoomSummary(7L, "ABC123", 1L, true));
        var authorization = new RoomAuthorizationService(client);

        assertThat(authorization.canControlPlayback(7L, 1L)).isTrue();
    }

    @Test
    void aGuestMayNot() {
        var client = new StubRoomServiceClient(new RoomSummary(7L, "ABC123", 1L, true));
        var authorization = new RoomAuthorizationService(client);

        assertThat(authorization.canControlPlayback(7L, 2L)).isFalse();
    }

    @Test
    void repeatedCommandsDoNotHammerRoomService() {
        var client = new StubRoomServiceClient(new RoomSummary(7L, "ABC123", 1L, true));
        var authorization = new RoomAuthorizationService(client);

        for (int i = 0; i < 25; i++) {
            authorization.canControlPlayback(7L, 1L);
        }

        assertThat(client.calls.get()).isEqualTo(1);
    }

    @Test
    void anUnreachableRoomServiceDegradesInsteadOfFreezingTheRoom() {
        var client = new StubRoomServiceClient(null);
        var authorization = new RoomAuthorizationService(client);

        assertThat(authorization.canControlPlayback(7L, 99L)).isTrue();
    }

    @Test
    void missingIdentifiersAreRejected() {
        var client = new StubRoomServiceClient(new RoomSummary(7L, "ABC123", 1L, true));
        var authorization = new RoomAuthorizationService(client);

        assertThat(authorization.canControlPlayback(null, 1L)).isFalse();
        assertThat(authorization.canControlPlayback(7L, null)).isFalse();
    }
}
