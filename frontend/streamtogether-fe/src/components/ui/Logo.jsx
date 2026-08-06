/** StreamTogether wordmark — display-face shout + mint play-shield glyph. */
export default function Logo({ className = "", showText = true, size = "md" }) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const textSize =
    size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : "text-2xl";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`${dim} relative inline-flex shrink-0 items-center justify-center rounded-[8px] bg-mint`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2 text-ink-invert"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
        </svg>
      </span>
      {showText && (
        <span className={`display leading-none text-ink ${textSize}`}>
          Stream<span className="text-mint">Together</span>
        </span>
      )}
    </span>
  );
}
