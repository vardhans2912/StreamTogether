import Spinner from "./Spinner";

/* Verge pill buttons: mono UPPERCASE labels, flat fills, 1px hazard borders,
   color-as-elevation (no shadows). Focus ring is Focus Cyan. */
const VARIANTS = {
  // Primary — Jelly Mint pill. Inverts to a white "spotlight" tile on hover.
  primary:
    "rounded-[24px] bg-mint text-ink-invert hover:bg-ink hover:shadow-[0_0_0_1px_#c2c2c2] active:opacity-70",
  // Secondary — dark slate pill.
  secondary:
    "rounded-[24px] bg-surface text-muted-2 hover:bg-ink hover:text-ink-invert hover:shadow-[0_0_0_1px_#c2c2c2]",
  // Ghost — text-only, fills to slate on hover.
  ghost: "rounded-[24px] bg-transparent text-muted hover:bg-surface hover:text-ink",
  // Danger — Verge Ultraviolet is the alert hazard (no red in this system).
  danger:
    "rounded-[24px] bg-violet text-ink hover:bg-ink hover:text-violet hover:shadow-[0_0_0_1px_#5200ff]",
  // Outline — the loudest pill: mint hairline that inverts to a mint fill.
  outline:
    "rounded-[40px] bg-transparent text-mint shadow-[0_0_0_1px_#3cffd0] hover:bg-mint hover:text-ink-invert",
};

const SIZES = {
  sm: "px-4 py-2 text-[11px] gap-1.5",
  md: "px-6 py-2.5 text-xs gap-2",
  lg: "px-7 py-3 text-[13px] gap-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`kicker inline-flex items-center justify-center transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
