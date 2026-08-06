import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Gate for authenticated-only routes. Redirects to /login, preserving intent. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
