import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiShield, FiUser, FiEye, FiEyeOff, FiAlertCircle, FiLock } from "react-icons/fi";
import { adminLogin } from "../services/adminApi";
import "../admin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [adminId,  setAdminId]  = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!adminId.trim() || !password) {
      setError("Admin ID and password are required.");
      return;
    }
    try {
      setLoading(true);
      const data = await adminLogin(adminId.trim(), password);
      localStorage.setItem("admin_token", data.access_token);
      localStorage.setItem("admin_user", JSON.stringify({
        name: data.name, role: data.role, admin_id: data.admin_id,
      }));
      navigate("/admin/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.data?.message ||
        err?.response?.data?.detail ||
        "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ad-login-page">
      <div className="ad-login-card">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
          }}>
            <FiShield size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3c72" }}>
              Campus Marketplace Admin
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Secure Marketplace Control Panel
            </div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", marginBottom: 4 }}>
          Sign In
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>
          Admin access only. All actions are logged and audited.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "11px 14px", marginBottom: 18,
            fontSize: 13, color: "#991b1b", fontWeight: 500,
          }}>
            <FiAlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Admin ID */}
          <div className="ad-form-group">
            <label className="ad-label">Admin ID</label>
            <div style={{ position: "relative" }}>
              <FiUser size={15}
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                className="ad-input"
                style={{ paddingLeft: 38 }}
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="ad-form-group">
            <label className="ad-label">Password</label>
            <div style={{ position: "relative" }}>
              <FiLock size={15}
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                className="ad-input"
                style={{ paddingLeft: 38, paddingRight: 42 }}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="ad-btn ad-btn--primary ad-btn--full ad-btn--lg"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            <FiShield size={16} />
            {loading ? "Signing In…" : "Sign In to Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}