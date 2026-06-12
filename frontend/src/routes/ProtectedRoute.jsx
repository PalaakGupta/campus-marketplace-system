import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../services/authService";

/**
 * Wraps protected pages.
 * Redirects to /login if no valid token found in localStorage.
 * Preserves the attempted URL so we can redirect back after login.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}