import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import { LoadingBlock } from "../components/ui/Spinner";
import RoomCard from "../components/dashboard/RoomCard";
import { roomApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const loadRooms = useCallback(async () => {
    setLoadError("");
    try {
      const data = await roomApi.list();
      setRooms(data);
    } catch (err) {
      setLoadError(err.message || "Couldn't load your rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const room = await roomApi.create({ roomName: name });
      toast.success(`Room "${room.roomName}" created.`);
      navigate(`/room/${room.roomCode}`);
    } catch (err) {
      toast.error(err.message || "Couldn't create the room.");
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Enter a room code.");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const room = await roomApi.join(code);
      toast.success(`Joined "${room.roomName}".`);
      navigate(`/room/${room.roomCode}`);
    } catch (err) {
      setJoinError(err.message || "Couldn't join that room.");
      setJoining(false);
    }
  };

  const firstName = (user?.displayName || user?.username || "").split(" ")[0];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader
        right={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <span className="text-sm leading-none">+</span> Create Room
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome — StoryStream hero tile */}
        <section className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] border border-frame bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <span className="absolute inset-y-0 left-0 w-1.5 bg-mint" aria-hidden />
          <div className="flex items-center gap-5">
            <Avatar
              name={user?.displayName || user?.username}
              seed={user?.username}
              size="xl"
              avatarUrl={user?.avatarUrl}
            />
            <div>
              <p className="kicker text-mint">Welcome back</p>
              <h1 className="display mt-1.5 text-4xl text-ink sm:text-5xl">{firstName || "there"}</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Host a room or hop into one with a code.
              </p>
            </div>
          </div>

          {/* Join by code */}
          <form onSubmit={handleJoin} className="w-full sm:w-auto">
            <label htmlFor="join-code" className="kicker mb-2 block text-muted">
              Join by code
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError("");
                }}
                placeholder="ABC123"
                maxLength={8}
                aria-invalid={Boolean(joinError)}
                className={`w-36 rounded-[2px] border bg-canvas px-3.5 py-2.5 font-mono text-sm uppercase tracking-widest text-ink placeholder:text-muted placeholder:tracking-normal focus:outline-none ${
                  joinError ? "border-violet focus:border-violet" : "border-frame focus:border-mint"
                }`}
              />
              <Button type="submit" variant="secondary" loading={joining}>
                Join
              </Button>
            </div>
            {joinError && <p className="kicker mt-2 text-violet">{joinError}</p>}
          </form>
        </section>

        {/* Rooms list */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between border-b border-frame pb-3">
            <h2 className="kicker text-base text-ink">Your rooms</h2>
            {!loading && rooms.length > 0 && (
              <span className="kicker text-muted">{rooms.length} total</span>
            )}
          </div>

          {loading ? (
            <LoadingBlock label="Loading your rooms…" />
          ) : loadError ? (
            <EmptyState
              icon="⚠️"
              title="Couldn't load rooms"
              description={loadError}
              action={
                <Button variant="secondary" onClick={loadRooms}>
                  Try again
                </Button>
              }
            />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon="🎬"
              title="No rooms yet"
              description="Create your first watch party room to get started."
              action={<Button onClick={() => setCreateOpen(true)}>Create a room</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} isHost={room.hostUserId === user?.id} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create room modal */}
      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Create a room"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!roomName.trim()}>
              Create & enter
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Input
            label="Room name"
            placeholder="e.g. Friday Night Movie"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            autoFocus
            hint="You'll get a short code to share with friends."
          />
        </form>
      </Modal>
    </div>
  );
}
