import { avatarColor, initials } from "../../lib/avatar";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

/** Deterministic initials-avatar. Falls back to an image when avatarUrl given. */
export default function Avatar({ name, seed, avatarUrl, size = "md", className = "", ring = false }) {
  const label = name || "?";
  const color = avatarColor(seed || name || "?");
  const ringClass = ring ? "ring-2 ring-canvas" : "";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        title={label}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ${ringClass} ${className}`}
      />
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={`${SIZES[size]} inline-flex shrink-0 select-none items-center justify-center rounded-full font-mono font-bold uppercase text-ink ${ringClass} ${className}`}
      style={{ backgroundColor: color }}
    >
      {initials(label)}
    </span>
  );
}
