import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginService, logout as logoutService, getStoredUser, isAuthenticated } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getStoredUser());
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (loginId, password) => {
    const data = await loginService(loginId, password);
    setUser({
      userId:  data.user_id,
      name:    data.name,
      loginId: data.login_id,
      token:   data.access_token,
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    logoutService();
  }, []);

  const value = { user, loading, login, logout, isAuthenticated: isAuthenticated() };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}