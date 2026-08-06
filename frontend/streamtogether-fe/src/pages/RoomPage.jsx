import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RoomHeader from "../components/room/RoomHeader";
import VideoPlayer from "../components/room/VideoPlayer";
import ChatPanel from "../components/room/ChatPanel";
import ParticipantsPanel from "../components/room/ParticipantsPanel";
import MediaQueue from "../components/room/MediaQueue";
import { LoadingBlock } from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { roomApi, chatApi, streamApi } from "../api";
import { USE_MOCK } from "../api/config";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useRoomChannel from "../hooks/useRoomChannel";
import useInterval from "../hooks/useInterval";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { ROOM_EVENTS } from "../api/realtime/events";
import { publishPlaybackState } from "../api/realtime/roomChannel";
import { serverNow } from "../api/realtime/stompClient";
import { normalizePlaybackState } from "../lib/playback";

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "queue", label: "Queue" },
  { id: "people", label: "People" },
];

export default function RoomPage() {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [errorMsg, setErrorMsg] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [playbackState, setPlaybackState] = useState(null);
  const [presence, setPresence] = useState(null);

  const [tab, setTab] = useState("chat");
  const [ending, setEnding] = useState(false);
  const [endedNotice, setEndedNotice] = useState(false);

  const isHost = room && user && room.hostUserId === user.id;
  const roomId = room?.id;
  useDocumentTitle(room ? room.roomName : "Room");

  // Guard so we only auto-join once.
  const joinedRef = useRef(false);

  // ---- initial load: fetch room, join, then hydrate sub-resources ----------
  useEffect(() => {
    let active = true;
    joinedRef.current = false;
    setStatus("loading");

    (async () => {
      try {
        await roomApi.get(roomCode); // existence check (throws 404)
        const joined = await roomApi.join(roomCode);
        if (!active) return;
        joinedRef.current = true;
        setRoom(joined);
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        if (err.status === 404) {
          setStatus("notfound");
        } else if (err.status === 410) {
          // room ended — still show it read-only
          try {
            const r = await roomApi.get(roomCode);
            if (active) {
              setRoom(r);
              setStatus("ready");
            }
          } catch {
            if (active) setStatus("notfound");
          }
        } else {
          setErrorMsg(err.message || "Couldn't open this room.");
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [roomCode]);

  const refreshParticipants = useCallback(async () => {
    if (!roomCode) return;
    try {
      const list = await roomApi.participants(roomCode);
      setParticipants(list);
    } catch {
      /* keep previous */
    } finally {
      setPeopleLoading(false);
    }
  }, [roomCode]);

  const refreshMedia = useCallback(async () => {
    if (!roomId) return;
    try {
      const list = await streamApi.listMedia(roomId);
      setMedia(list);
    } catch {
      /* keep previous */
    } finally {
      setMediaLoading(false);
    }
  }, [roomId]);

  const refreshState = useCallback(async () => {
    if (!roomId) return;
    try {
      const s = await streamApi.getState(roomId);
      setPlaybackState(normalizePlaybackState(s));
    } catch {
      /* keep previous */
    }
  }, [roomId]);

  const refreshChat = useCallback(async () => {
    if (!roomId) return;
    try {
      const list = await chatApi.list(roomId);
      setMessages(list);
    } catch {
      /* keep previous */
    } finally {
      setChatLoading(false);
    }
  }, [roomId]);

  // Hydrate sub-resources once the room is ready.
  useEffect(() => {
    if (status !== "ready" || !roomId) return;
    refreshParticipants();
    refreshMedia();
    refreshState();
    refreshChat();
  }, [status, roomId, refreshParticipants, refreshMedia, refreshState, refreshChat]);

  // ---- realtime (STOMP over WebSocket; BroadcastChannel in mock mode) ------
  const { connected: liveConnected } = useRoomChannel(
    roomId,
    {
      [ROOM_EVENTS.CHAT_MESSAGE]: (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      },
      [ROOM_EVENTS.STATE_UPDATE]: (s) => setPlaybackState(normalizePlaybackState(s)),
      [ROOM_EVENTS.MEDIA_ADDED]: () => refreshMedia(),
      [ROOM_EVENTS.PARTICIPANT_JOINED]: () => refreshParticipants(),
      [ROOM_EVENTS.PRESENCE_UPDATE]: (p) => {
        setPresence(p);
        // Someone new on the socket may not be in the persisted roster yet.
        refreshParticipants();
      },
      [ROOM_EVENTS.REALTIME_ERROR]: (err) => {
        if (err?.message) toast.error(err.message);
      },
      [ROOM_EVENTS.ROOM_ENDED]: () => {
        setRoom((prev) => (prev ? { ...prev, isActive: false } : prev));
        setEndedNotice(true);
      },
    },
    { displayName: user?.displayName, avatarUrl: user?.avatarUrl },
  );

  // ---- reconciliation ------------------------------------------------------
  // Push is the delivery mechanism; polling is now only a safety net. While the
  // socket is up we re-read slowly (a dropped frame or a write that predates the
  // subscription would otherwise persist); when it is down — blocked upgrade,
  // hub restart — we fall back to the old 3s cadence so the room still works.
  const pollIntervalMs = (() => {
    if (status !== "ready") return null;
    if (USE_MOCK) return 8000;
    return liveConnected ? 30000 : 3000;
  })();

  useInterval(() => {
    refreshState();
    if (!USE_MOCK && !liveConnected) {
      refreshChat();
      refreshParticipants();
      refreshMedia();
    }
  }, pollIntervalMs);

  // Presence only means anything while the socket is up.
  useEffect(() => {
    if (!liveConnected) setPresence(null);
  }, [liveConnected]);

  const onlineUserIds = presence?.users
    ? new Set(presence.users.map((u) => u.userId))
    : null;

  // ---- host actions --------------------------------------------------------
  const currentMedia = media.find((m) => m.id === playbackState?.mediaId) || null;

  const pushState = useCallback(
    async (patch) => {
      if (!roomId) return;
      const optimistic = normalizePlaybackState({
        ...playbackState,
        ...patch,
        roomId,
        positionAtServerMillis: serverNow(),
      });
      setPlaybackState(optimistic);

      const command = {
        mediaId: optimistic.mediaId,
        currentTimeSeconds: optimistic.currentTimeSeconds,
        isPlaying: optimistic.isPlaying,
      };

      // Over the socket a play/pause reaches the other clients in one hop. If it
      // isn't up, the REST endpoint still writes the same authoritative row (and
      // fans it out server-side), so hosts never lose control of the room.
      if (!USE_MOCK && publishPlaybackState(roomId, command)) return;

      try {
        setPlaybackState(normalizePlaybackState(await streamApi.setState(roomId, command)));
      } catch (err) {
        toast.error(err.message || "Couldn't sync playback.");
      }
    },
    [roomId, playbackState, toast],
  );

  const handleHostChange = useCallback(
    ({ currentTimeSeconds, isPlaying }) => {
      pushState({ currentTimeSeconds, isPlaying });
    },
    [pushState],
  );

  const handleSelectMedia = useCallback(
    (item) => {
      pushState({ mediaId: item.id, currentTimeSeconds: 0, isPlaying: true });
    },
    [pushState],
  );

  const handleAddMedia = useCallback(
    async ({ mediaUrl, mediaType }) => {
      const created = await streamApi.addMedia(roomId, { mediaUrl, mediaType });
      setMedia((prev) => [...prev, created]);
      toast.success("Added to the queue.");
      await refreshState();
    },
    [roomId, refreshState, toast],
  );

  const handleSend = useCallback(
    async (text) => {
      const created = await chatApi.send(roomId, text);
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
    },
    [roomId],
  );

  const handleLeave = () => {
    navigate("/");
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await roomApi.end(roomCode);
      toast.info("Room ended.");
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Couldn't end the room.");
      setEnding(false);
    }
  };

  // ---- render --------------------------------------------------------------
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingBlock label="Opening room…" />
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <CenteredMessage
        icon="🔍"
        title="Room not found"
        description={`We couldn't find a room with code "${roomCode}".`}
        onBack={() => navigate("/")}
      />
    );
  }

  if (status === "error") {
    return (
      <CenteredMessage
        icon="⚠️"
        title="Something went wrong"
        description={errorMsg}
        onBack={() => navigate("/")}
      />
    );
  }

  const chatDisabled = !room?.isActive;

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <RoomHeader
        room={room}
        isHost={isHost}
        onLeave={handleLeave}
        onEnd={handleEnd}
        ending={ending}
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden px-4 py-4 lg:flex-row lg:px-6">
        {/* Main: player + queue */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:overflow-visible">
          <VideoPlayer
            media={currentMedia}
            state={playbackState}
            isHost={Boolean(isHost) && room.isActive}
            onHostChange={handleHostChange}
          />

          {/* Now playing / host hint */}
          <div className="flex items-center justify-between rounded-[16px] border border-frame bg-canvas px-4 py-3">
            <div className="min-w-0">
              <p className="kicker text-mint">Now playing</p>
              <p className="mt-1 truncate text-sm font-medium text-ink">
                {currentMedia ? currentMedia.title || currentMedia.mediaUrl : "Nothing selected"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <SyncIndicator connected={liveConnected} presentCount={presence?.count} />
              <p className="kicker text-muted">
                {isHost ? "You control playback" : "Synced to host"}
              </p>
            </div>
          </div>

          {/* Queue below player on wide screens */}
          <div className="hidden overflow-hidden rounded-[16px] border border-frame bg-canvas lg:block">
            <div className="max-h-64">
              <MediaQueue
                media={media}
                loading={mediaLoading}
                currentMediaId={playbackState?.mediaId}
                isHost={Boolean(isHost) && room.isActive}
                onAdd={handleAddMedia}
                onSelect={handleSelectMedia}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex min-h-0 w-full flex-col overflow-hidden rounded-[16px] border border-frame bg-canvas lg:w-[360px]">
          {/* Tab switcher — active tab carries the signature mint underline */}
          <div className="flex border-b border-frame">
            {TABS.map((t) => {
              const count =
                t.id === "chat" ? messages.length : t.id === "people" ? participants.length : media.length;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`kicker flex flex-1 items-center justify-center gap-2 px-3 py-3.5 transition ${
                    active
                      ? "text-mint shadow-[inset_0_-2px_0_0_#3cffd0]"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-[20px] px-1.5 py-0.5 font-mono text-[10px] ${
                      active ? "bg-mint text-ink-invert" : "bg-surface text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "chat" && (
              <ChatPanel
                messages={messages}
                loading={chatLoading}
                currentUserId={user?.id}
                onSend={handleSend}
                disabled={chatDisabled}
              />
            )}
            {tab === "people" && (
              <ParticipantsPanel
                participants={participants}
                loading={peopleLoading}
                currentUserId={user?.id}
                onlineUserIds={onlineUserIds}
              />
            )}
            {tab === "queue" && (
              <MediaQueue
                media={media}
                loading={mediaLoading}
                currentMediaId={playbackState?.mediaId}
                isHost={Boolean(isHost) && room.isActive}
                onAdd={handleAddMedia}
                onSelect={handleSelectMedia}
              />
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={endedNotice}
        onClose={() => setEndedNotice(false)}
        title="This room has ended"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEndedNotice(false)}>
              Stay & review
            </Button>
            <Button onClick={() => navigate("/")}>Back to dashboard</Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          The host ended this watch party. Playback and chat are now read-only.
        </p>
      </Modal>
    </div>
  );
}

/**
 * Whether this client is on the live socket or has fallen back to polling —
 * worth surfacing, because it's the difference between instant sync and a few
 * seconds of lag. Mock mode is always "live" (BroadcastChannel).
 */
function SyncIndicator({ connected, presentCount }) {
  if (USE_MOCK) return null;
  return (
    <span
      title={
        connected
          ? "Live — playback, chat and presence are pushed over WebSocket"
          : "Reconnecting — falling back to periodic refresh"
      }
      className={`kicker flex items-center gap-1.5 ${connected ? "text-mint" : "text-muted"}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-mint" : "animate-pulse bg-violet"
        }`}
      />
      {connected ? `Live${presentCount ? ` · ${presentCount}` : ""}` : "Reconnecting…"}
    </span>
  );
}

function CenteredMessage({ icon, title, description, onBack }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[16px] bg-surface text-3xl">
          {icon}
        </div>
        <h1 className="display text-2xl text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        <Button className="mt-6" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
