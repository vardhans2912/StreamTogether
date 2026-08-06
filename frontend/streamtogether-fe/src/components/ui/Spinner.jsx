const SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

export default function Spinner({ size = "md", className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-frame border-t-mint ${SIZES[size]} ${className}`}
    />
  );
}

/** Full-area centered spinner for page/section loading states. */
export function LoadingBlock({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-muted ${className}`}>
      <Spinner size="lg" />
      <p className="kicker">{label}</p>
    </div>
  );
}
