import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getToken, getUserJson, saveSession } from "../auths/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, u] = await Promise.all([getToken(), getUserJson()]);
      if (!active) return;
      setToken(t || null);
      setUser(u || null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = async (nextToken, nextUser) => {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  };

  const signOut = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      role: String(user?.role || "CLIENT").toUpperCase(),
      isAuthenticated: !!token,
      signIn,
      signOut,
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

