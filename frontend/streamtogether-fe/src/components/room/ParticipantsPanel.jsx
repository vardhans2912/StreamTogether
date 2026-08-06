import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { LoadingBlock } from "../ui/Spinner";
import { relativeTime } from "../../lib/time";

/**
 * `onlineUserIds` is a Set of user ids currently holding a live socket, or null
 * when presence is unavailable (mock mode, or the socket is down) — in which
 * case everyone is shown as present rather than falsely greyed out.
 */
export default function ParticipantsPanel({
  participants,
  loading,
  currentUserId,
  onlineUserIds = null,
}) {
  const isOnline = (userId) => !onlineUserIds || onlineUserIds.has(userId);
  const onlineCount = onlineUserIds
    ? participants.filter((p) => onlineUserIds.has(p.id)).length
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-frame px-4 py-3.5">
        <h2 className="kicker text-mint">Participants</h2>
        <span className="kicker text-muted">
          {onlineCount !== null
            ? `${onlineCount} here · ${participants.length}`
            : participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <LoadingBlock label="Loading…" />
        ) : (
          <ul className="space-y-0.5">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[12px] px-2 py-2 transition hover:bg-surface"
              >
                <div className="relative">
                  <Avatar
                    name={p.displayName || p.username}
                    seed={p.username}
                    size="md"
                    avatarUrl={p.avatarUrl}
                  />
                  <span
                    title={isOnline(p.id) ? "In the room now" : "Away"}
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-canvas ${
                      isOnline(p.id) ? "bg-mint" : "bg-muted"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.displayName || p.username}
                    {p.id === currentUserId && (
                      <span className="ml-1.5 font-mono text-[11px] uppercase tracking-wide text-muted">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="kicker text-muted">Joined {relativeTime(p.joinedAt)}</p>
                </div>
                {p.isHost && <Badge variant="host">Host</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
