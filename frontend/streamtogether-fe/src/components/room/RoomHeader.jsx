import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { useToast } from "../../context/ToastContext";

export default function RoomHeader({ room, isHost, onLeave, onEnd, ending }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      toast.success("Room code copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the code.");
    }
  };

  return (
    <header className="border-b border-frame bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" aria-label="Back to dashboard" className="shrink-0">
            <Logo showText={false} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-lg font-bold text-ink">{room.roomName}</h1>
              {room.isActive ? (
                <Badge variant="live" dot>
                  Live
                </Badge>
              ) : (
                <Badge variant="ended">Ended</Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-muted">
              <span className="kicker">Host</span>
              <Avatar
                name={room.host?.displayName || room.host?.username}
                seed={room.host?.username}
                size="xs"
                avatarUrl={room.host?.avatarUrl}
              />
              <span className="text-xs text-muted-2">
                {room.host?.displayName || room.host?.username}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 rounded-[2px] border border-frame px-3 py-2 transition hover:border-mint"
            title="Copy room code"
          >
            <span className="kicker text-muted">Code</span>
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {room.roomCode}
            </span>
            <span className="text-mint">{copied ? "✓" : "⧉"}</span>
          </button>

          {isHost && room.isActive && (
            <Button variant="danger" size="sm" onClick={onEnd} loading={ending}>
              End room
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </header>
  );
}
