import { useId } from "react";

/* Tight "newspaper form" inputs: 2px radius, 1px border, mono uppercase label.
   Focus shifts the border to mint; errors turn it ultraviolet. No glow. */
export default function Input({
  label,
  error,
  hint,
  className = "",
  containerClassName = "",
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="kicker text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-[2px] border bg-canvas px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted transition-colors duration-150 focus:outline-none disabled:opacity-60 ${
          error
            ? "border-violet focus:border-violet"
            : "border-frame focus:border-mint"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="kicker text-violet">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
