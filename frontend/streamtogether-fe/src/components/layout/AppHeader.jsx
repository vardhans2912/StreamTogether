import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Avatar from "../ui/Avatar";
import Logo from "../ui/Logo";

export default function AppHeader({ right = null }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleLogout = () => {
    logout();
    toast.info("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-frame bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="transition hover:opacity-90" aria-label="StreamTogether home">
          <Logo />
        </Link>

        <div className="flex items-center gap-3">
          {right}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[24px] border border-frame py-1 pl-1 pr-2.5 transition hover:border-mint"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <Avatar
                  name={user.displayName || user.username}
                  seed={user.username}
                  size="sm"
                  avatarUrl={user.avatarUrl}
                />
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-ink sm:block">
                  {user.displayName || user.username}
                </span>
                <svg
                  className="h-4 w-4 text-muted"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-[16px] border border-ink/80 bg-canvas"
                >
                  <div className="border-b border-frame px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">
                      {user.displayName || user.username}
                    </p>
                    <p className="truncate font-mono text-[11px] lowercase text-muted">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      navigate("/");
                    }}
                    className="kicker flex w-full items-center px-4 py-3 text-left text-muted-2 transition hover:bg-surface hover:text-ink"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="kicker flex w-full items-center px-4 py-3 text-left text-muted transition hover:bg-violet hover:text-ink"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
