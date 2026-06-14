"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearAuthSession,
  getStoredAuthSession,
  loginRequest,
  saveAuthSession,
  subscribeToAuthSession,
  type AuthSession,
  type AuthUser,
} from "../services/auth";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  role: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToAuthSession, getStoredAuthSession, () => null);
  const token = session?.token || null;
  const user = (session?.user as AuthUser | null) || null;

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password);
    saveAuthSession(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(token && user),
      isReady: true,
      login,
      logout,
    }),
    [login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
