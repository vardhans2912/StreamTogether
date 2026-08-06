import { useEffect, useRef, useState } from "react";
import { subscribe as subscribeMock } from "../api/mock/realtime";
import { subscribeToRoom } from "../api/realtime/roomChannel";
import { STATUS, onStatusChange } from "../api/realtime/stompClient";
import { USE_MOCK } from "../api/config";

/**
 * Subscribe to a room's realtime events.
 *
 * Real backend: a STOMP subscription per room topic on the shared WebSocket to
 * stream-service. Mock mode: BroadcastChannel across tabs. Both speak the same
 * ROOM_EVENTS vocabulary, so callers don't branch.
 *
 * `handlers` maps ROOM_EVENTS.* -> callback. It re-subscribes when roomId
 * changes; handler updates are read through a ref so callers needn't memoize.
 *
 * @returns { connected, status } — false/degraded means the caller should keep
 *          polling as a fallback.
 */
export default function useRoomChannel(roomId, handlers, identity) {
  const handlersRef = useRef(handlers);
  const identityRef = useRef(identity);
  const [status, setStatus] = useState(USE_MOCK ? STATUS.CONNECTED : STATUS.IDLE);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  // Mock mode: cross-tab BroadcastChannel, no connection to track.
  useEffect(() => {
    if (!roomId || !USE_MOCK) return undefined;
    return subscribeMock(roomId, ({ type, payload }) => {
      handlersRef.current?.[type]?.(payload);
    });
  }, [roomId]);

  // Real backend: STOMP over the shared socket.
  useEffect(() => {
    if (!roomId || USE_MOCK) return undefined;
    return subscribeToRoom(
      roomId,
      (type, payload) => handlersRef.current?.[type]?.(payload),
      identityRef.current ?? {},
    );
  }, [roomId]);

  useEffect(() => {
    if (USE_MOCK) return undefined;
    return onStatusChange(setStatus);
  }, []);

  return { connected: status === STATUS.CONNECTED, status };
}
