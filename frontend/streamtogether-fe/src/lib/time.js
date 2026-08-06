// Time formatting helpers.

const UNITS = [
  { limit: 60, div: 1, name: "s" },
  { limit: 3600, div: 60, name: "m" },
  { limit: 86400, div: 3600, name: "h" },
  { limit: 604800, div: 86400, name: "d" },
];

/** Compact relative timestamp, e.g. "just now", "5m", "3h", "2d", or a date. */
export function relativeTime(input) {
  if (!input) return "";
  const then = typeof input === "number" ? input : new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, (Date.now() - then) / 1000);

  if (seconds < 5) return "just now";
  for (const unit of UNITS) {
    if (seconds < unit.limit) {
      const value = Math.floor(seconds / unit.div);
      return `${value}${unit.name}`;
    }
  }
  return new Date(then).toLocaleDateString();
}

/** Clock-style time, e.g. "3:07 PM". */
export function clockTime(input) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Seconds -> "m:ss" or "h:mm:ss" for a media playhead. */
export function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}
