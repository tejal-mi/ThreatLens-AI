import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, parseJwt } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("threatlens_token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("threatlens_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("threatlens_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Check if token expired
      const payload = parseJwt(storedToken);
      if (payload && payload.exp && payload.exp * 1000 < Date.now()) {
        logout();
        setLoading(false);
        return;
      }

      try {
        const me = await authApi.getMe(storedToken);
        if (me && me.account) {
          setUser(me.account);
          localStorage.setItem("threatlens_user", JSON.stringify(me.account));
        }
      } catch {
        // Fallback to cached user if offline
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (newToken, account) => {
    setToken(newToken);
    setUser(account);
    localStorage.setItem("threatlens_token", newToken);
    localStorage.setItem("threatlens_user", JSON.stringify(account));
  };

  const logout = async () => {
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // Ignore logout errors
      }
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("threatlens_token");
    localStorage.removeItem("threatlens_user");
  };

  const updateUser = (updatedAccount) => {
    setUser(updatedAccount);
    localStorage.setItem("threatlens_user", JSON.stringify(updatedAccount));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
