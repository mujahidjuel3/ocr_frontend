"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ApiError,
  login as apiLogin,
  me,
  register as apiRegister,
  resetUnauthorizedLatch,
  setUnauthorizedHandler,
  type AuthResponse,
  type AuthUser,
  type MeResponse,
} from "@/lib/api";
import { classifyAuthFailure } from "@/lib/auth/errors";
import { isAuthDisabled } from "@/lib/auth/flags";
import { clearAccessToken, readAccessToken, safeReturnPath, subscribeAuthBroadcast, writeAccessToken } from "@/lib/auth/session";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  tenantName: string;
  error: string;
  clearError: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { tenantName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(meUser: MeResponse): AuthUser {
  return {
    id: meUser.id,
    email: meUser.email,
    name: meUser.name,
    tenantId: meUser.tenant.id,
    tenantName: meUser.tenant.name,
  };
}

function fromLogin(result: AuthResponse): AuthUser {
  return result.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const redirecting = useRef(false);

  const clearSession = useCallback((reason: "logout" | "expired" = "logout") => {
    clearAccessToken(reason);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const goToLogin = useCallback((nextPath?: string) => {
    // Login temporarily disabled for open demo.
    if (isAuthDisabled()) {
      router.replace("/dashboard");
      return;
    }
    if (redirecting.current) return;
    const onAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
    if (onAuthPage) return;
    redirecting.current = true;
    const next = encodeURIComponent(safeReturnPath(nextPath ?? pathname));
    router.replace(`/login?next=${next}`);
    queueMicrotask(() => {
      redirecting.current = false;
    });
  }, [pathname, router]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const openDemo = isAuthDisabled();
    const token = readAccessToken();
    if (!token && !openDemo) {
      setUser(null);
      setStatus("unauthenticated");
      return false;
    }
    try {
      const profile = await me();
      setUser(toAuthUser(profile));
      setStatus("authenticated");
      resetUnauthorizedLatch();
      return true;
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 0) {
        // Keep local session on temporary network failure; UI can retry.
        setStatus((current) => (current === "authenticated" ? "authenticated" : "loading"));
        return false;
      }
      if (openDemo) {
        setError(reason instanceof ApiError ? reason.message : "Could not open the demo workspace");
        setStatus("loading");
        return false;
      }
      if (reason instanceof ApiError && reason.status === 401) {
        clearSession("expired");
        return false;
      }
      clearSession("expired");
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (isAuthDisabled()) {
        setError("The invoice service rejected the open-demo session. Check AUTH_DISABLED on the API.");
        setStatus("loading");
        return;
      }
      setUser(null);
      setStatus("unauthenticated");
      goToLogin();
    });
    return () => setUnauthorizedHandler(null);
  }, [goToLogin]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const openDemo = isAuthDisabled();
      const token = readAccessToken();
      if (!token && !openDemo) {
        if (!ignore) {
          setStatus("unauthenticated");
          setUser(null);
        }
        return;
      }
      try {
        // Open demo: backend AUTH_DISABLED injects the seed tenant without a JWT.
        const profile = await me();
        if (ignore) return;
        setUser(toAuthUser(profile));
        setStatus("authenticated");
        resetUnauthorizedLatch();
      } catch (reason) {
        if (ignore) return;
        if (reason instanceof ApiError && reason.status === 0) {
          // Token exists but API unreachable — stay loading so protected UI does not flash.
          setError("The invoice service could not be reached. Retrying session restore…");
          setStatus("loading");
          return;
        }
        if (openDemo) {
          setError(reason instanceof ApiError ? reason.message : "Could not open the demo workspace");
          setStatus("loading");
          return;
        }
        clearSession("expired");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [clearSession]);

  useEffect(() => {
    return subscribeAuthBroadcast((event) => {
      if (event.type === "logout" || event.type === "expired") {
        setUser(null);
        setStatus("unauthenticated");
        if (event.type === "expired") goToLogin();
        return;
      }
      if (event.type === "login") {
        void refreshSession();
      }
    });
  }, [goToLogin, refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    setError("");
    try {
      const result = await apiLogin(email.trim().toLowerCase(), password);
      writeAccessToken(result.accessToken);
      setUser(fromLogin(result));
      setStatus("authenticated");
      resetUnauthorizedLatch();
    } catch (reason) {
      const failure = classifyAuthFailure(reason);
      setError(failure.message);
      throw reason;
    }
  }, []);

  const register = useCallback(async (input: { tenantName: string; name: string; email: string; password: string }) => {
    setError("");
    try {
      const result = await apiRegister({
        tenantName: input.tenantName.trim(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      writeAccessToken(result.accessToken);
      setUser(fromLogin(result));
      setStatus("authenticated");
      resetUnauthorizedLatch();
    } catch (reason) {
      const failure = classifyAuthFailure(reason);
      setError(failure.message);
      throw reason;
    }
  }, []);

  const logout = useCallback(() => {
    // Login temporarily disabled — stay on dashboard in open demo.
    if (isAuthDisabled()) {
      router.replace("/dashboard");
      return;
    }
    clearSession("logout");
    setError("");
    router.replace("/login");
  }, [clearSession, router]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    tenantName: user?.tenantName ?? "",
    error,
    clearError: () => setError(""),
    login,
    register,
    logout,
    refreshSession,
  }), [status, user, error, login, register, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
