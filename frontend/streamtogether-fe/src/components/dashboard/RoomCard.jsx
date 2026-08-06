import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { relativeTime } from "../../lib/time";

/* Rave-flyer accent palette — each room gets a stable hue from its code. */
const ACCENTS = ["text-mint", "text-tile-pink", "text-tile-yellow", "text-tile-blue", "text-tile-orange"];

function accentFor(code = "") {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash << 5) - hash + code.charCodeAt(i);
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

export default function RoomCard({ room, isHost }) {
  const accent = accentFor(room.roomCode);

  return (
    <Link
      to={`/room/${room.roomCode}`}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-[20px] border border-frame bg-canvas p-6 transition-colors duration-150 hover:border-ink"
    >
      {/* left accent spine */}
      <span className={`absolute inset-y-0 left-0 w-1 ${accent.replace("text-", "bg-")}`} aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`kicker mb-2 ${accent}`}>{room.roomCode}</p>
          <h3 className="truncate text-xl font-bold leading-tight text-ink transition-colors group-hover:text-link">
            {room.roomName}
          </h3>
          <p className="kicker mt-2 text-muted">Created {relativeTime(room.createdAt)}</p>
        </div>
        {room.isActive ? (
          <Badge variant="live" dot>
            Live
          </Badge>
        ) : (
          <Badge variant="ended">Ended</Badge>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-frame pt-4">
        <div className="flex items-center gap-2.5">
          <Avatar
            name={room.host?.displayName || room.host?.username}
            seed={room.host?.username}
            size="sm"
            avatarUrl={room.host?.avatarUrl}
          />
          <div>
            <p className="text-sm font-medium text-ink">
              {room.host?.displayName || room.host?.username}
            </p>
            <p className="kicker text-muted">{isHost ? "You host" : "Host"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003z" />
          </svg>
          <span className="kicker">{room.participantCount}</span>
        </div>
      </div>
    </Link>
  );
}
