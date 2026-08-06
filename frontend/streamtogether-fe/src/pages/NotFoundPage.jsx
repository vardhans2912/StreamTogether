import { Link } from "react-router-dom";
import Logo from "../components/ui/Logo";
import Button from "../components/ui/Button";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-4 text-center text-ink">
      <div className="relative">
        <Logo size="lg" className="mx-auto mb-10" />
        <p className="display text-8xl text-mint sm:text-9xl">404</p>
        <p className="kicker mt-4 text-violet">Page not found</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button size="lg">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
