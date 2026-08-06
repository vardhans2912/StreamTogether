import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** For /login and /register: authed users get bounced to their intended page or /. */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const to = location.state?.from?.pathname || "/";
    return <Navigate to={to} replace />;
  }
  return children;
}
