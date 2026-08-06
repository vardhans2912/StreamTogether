// Deterministic avatar helpers: same name always yields the same color + initials.

const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#ef4444", // red
  "#84cc16", // lime
];

/** Stable hash of a string -> non-negative int. */
function hashString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

/** Deterministic background color for a given seed (username/displayName). */
export function avatarColor(seed = "?") {
  return PALETTE[hashString(seed) % PALETTE.length];
}

/** Up to two initials derived from a name. */
export function initials(name = "?") {
  const cleaned = String(name).trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
