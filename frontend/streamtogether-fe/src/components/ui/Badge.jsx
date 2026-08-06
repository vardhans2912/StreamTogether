/* Pill tags — mono UPPERCASE on saturated hazard fills. Radius 20px. */
const VARIANTS = {
  neutral: "bg-surface text-muted-2",
  live: "bg-mint text-ink-invert",
  ended: "bg-surface text-muted",
  host: "bg-violet text-ink",
  accent: "bg-tile-blue text-ink",
  youtube: "bg-mint text-ink-invert",
};

export default function Badge({ children, variant = "neutral", dot = false, className = "" }) {
  return (
    <span
      className={`kicker inline-flex items-center gap-1.5 rounded-[20px] px-2.5 py-1 ${VARIANTS[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${
            variant === "live" ? "animate-pulse" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}
