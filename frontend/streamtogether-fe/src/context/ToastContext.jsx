import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { uid } from "../lib/ids";

const ToastContext = createContext(null);

const ICONS = {
  success: "✓",
  error: "✕",
  info: "i",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = uid("toast_");
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, d) => push(m, "success", d),
      error: (m, d) => push(m, "error", d),
      info: (m, d) => push(m, "info", d),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[16px] border bg-canvas px-4 py-3 transition ${toastStyles(
              t.type,
            )}`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeStyles(
                t.type,
              )}`}
            >
              {ICONS[t.type] || ICONS.info}
            </span>
            <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-muted transition hover:text-ink"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toastStyles(type) {
  switch (type) {
    case "success":
      return "border-mint";
    case "error":
      return "border-violet";
    default:
      return "border-frame";
  }
}

function badgeStyles(type) {
  switch (type) {
    case "success":
      return "bg-mint text-ink-invert";
    case "error":
      return "bg-violet text-ink";
    default:
      return "bg-surface text-ink";
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export default ToastContext;
