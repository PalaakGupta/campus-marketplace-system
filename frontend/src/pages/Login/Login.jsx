import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiShield, FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { login, loading: authLoading } = useAuth();

  const [loginId, setLoginId]   = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Where to redirect after login (default: dashboard)
  const from = location.state?.from || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginId.trim()) {
      setError("Login ID is required");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);
      await login(loginId.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.error?.message ||
        "Invalid login ID or password";
      setError(typeof msg === "string" ? msg : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <FiShield size={26} />
          </div>
          <div>
            <p className="login-logo-title">Campus</p>
            <p className="login-logo-sub">Secure Marketplace</p>
          </div>
        </div>

        <h1 className="login-heading">Welcome back</h1>
        <p className="login-sub">Sign in to your campus account</p>

        {/* Error banner */}
        {error && (
          <div className="login-error">
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Login ID  */}
          <div className="field-group" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="login-id">
              Login ID
            </label>
            <input
              id="login-id"
              type="text"
              className="input-field"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="field-group" style={{ marginBottom: 20 }}>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <div className="login-password-wrap">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPass ? <FiEyeOff size={17} /> : <FiEye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || authLoading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <p>Campus Community Marketplace</p>
          <p>Secure · Trusted · Protected</p>
        </div>
      </div>
    </div>
  );
}
