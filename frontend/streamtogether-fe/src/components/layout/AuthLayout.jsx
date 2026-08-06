import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import { USE_MOCK } from "../../api/config";

/** Two-pane editorial shell for the login / register screens. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Brand / pitch pane */}
        <div className="hidden flex-1 flex-col justify-between p-12 lg:flex">
          <Link to="/" aria-label="StreamTogether home">
            <Logo size="lg" />
          </Link>

          <div className="max-w-md">
            <p className="whisper mb-4 text-mint" style={{ fontSize: "1.19rem" }}>
              Synchronized Watch Parties
            </p>
            <h1 className="display text-6xl text-ink sm:text-7xl">
              Stream together,
              <br />
              <span className="text-mint">in sync.</span>
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted">
              Create a room, drop a link, and hit play. Everyone sees the same frame at the same
              moment — with live chat right alongside.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Synchronized play, pause and seek",
                "YouTube & direct video support",
                "Live chat and participants",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-mint text-xs font-bold text-ink-invert">
                    ✓
                  </span>
                  <span className="kicker text-muted-2">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="kicker text-muted">© {new Date().getFullYear()} StreamTogether</p>
        </div>

        {/* Form pane — accent spine on the left edge (StoryStream rail) */}
        <div className="flex flex-1 items-center justify-center border-frame p-6 sm:p-12 lg:border-l">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <Logo size="md" />
            </div>
            <p className="kicker mb-2 text-mint">{subtitle ? "Access" : "Welcome"}</p>
            <h2 className="display text-4xl text-ink">{title}</h2>
            {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>}

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}

            {USE_MOCK && (
              <div className="mt-8 rounded-[16px] border border-mint-border bg-canvas px-4 py-3 text-[13px] leading-relaxed text-muted">
                <span className="kicker text-mint">Demo mode</span>
                <span className="mt-1 block">
                  No backend required. Try{" "}
                  <code className="rounded-[2px] bg-surface px-1.5 py-0.5 font-mono text-muted-2">
                    demo
                  </code>{" "}
                  /{" "}
                  <code className="rounded-[2px] bg-surface px-1.5 py-0.5 font-mono text-muted-2">
                    demo1234
                  </code>{" "}
                  or register a new account.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
