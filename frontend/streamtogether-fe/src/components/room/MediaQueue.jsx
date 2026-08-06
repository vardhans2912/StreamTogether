import { useState } from "react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import { LoadingBlock } from "../ui/Spinner";
import { normalizeMediaUrl, mediaLabel, MEDIA_TYPES } from "../../lib/media";
import { relativeTime } from "../../lib/time";

export default function MediaQueue({
  media,
  loading,
  currentMediaId,
  isHost,
  onAdd,
  onSelect,
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const parsed = normalizeMediaUrl(url);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setAdding(true);
    setError("");
    try {
      await onAdd({ mediaUrl: parsed.url, mediaType: parsed.type });
      setUrl("");
    } catch (err) {
      setError(err.message || "Couldn't add that media.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-frame px-4 py-3.5">
        <h2 className="kicker text-mint">Queue</h2>
        <span className="kicker text-muted">{media.length}</span>
      </div>

      {isHost && (
        <form onSubmit={submit} className="space-y-2 border-b border-frame p-3">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="Paste a YouTube or video URL"
            aria-label="Media URL"
            aria-invalid={Boolean(error)}
            className={`w-full rounded-[2px] border bg-canvas px-3 py-2 text-[15px] text-ink placeholder:text-muted focus:outline-none ${
              error ? "border-violet focus:border-violet" : "border-frame focus:border-mint"
            }`}
          />
          {error && <p className="kicker text-violet">{error}</p>}
          <Button type="submit" size="sm" loading={adding} disabled={!url.trim()} className="w-full">
            Add to queue
          </Button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <LoadingBlock label="Loading queue…" />
        ) : media.length === 0 ? (
          <EmptyState
            icon="📼"
            title="Queue is empty"
            description={isHost ? "Add a URL above to get started." : "The host hasn't queued anything yet."}
            className="border-none bg-transparent"
          />
        ) : (
          <ul className="space-y-1.5">
            {media.map((item, index) => {
              const isCurrent = item.id === currentMediaId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => isHost && onSelect(item)}
                    className={`group flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition ${
                      isCurrent
                        ? "border-mint bg-mint/10"
                        : "border-transparent hover:border-frame hover:bg-surface"
                    } ${!isHost ? "cursor-default" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] font-mono text-xs font-bold ${
                        isCurrent ? "bg-mint text-ink-invert" : "bg-surface text-muted"
                      }`}
                    >
                      {isCurrent ? "▶" : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{mediaLabel(item)}</p>
                      <p className="kicker mt-0.5 text-muted">Added {relativeTime(item.createdAt)}</p>
                    </div>
                    <Badge variant={item.mediaType === MEDIA_TYPES.YOUTUBE ? "youtube" : "neutral"}>
                      {item.mediaType === MEDIA_TYPES.YOUTUBE ? "YouTube" : "Video"}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
