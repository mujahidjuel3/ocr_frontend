"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthDisabled } from "@/lib/auth/flags";
import { safeReturnPath } from "@/lib/auth/session";
import { useAuth } from "./AuthProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, refreshSession, error, clearError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const openDemo = isAuthDisabled();

  useEffect(() => {
    // Login temporarily disabled — stay on the app shell.
    if (openDemo) return;
    if (status !== "unauthenticated") return;
    const next = encodeURIComponent(safeReturnPath(pathname));
    router.replace(`/login?next=${next}`);
  }, [openDemo, status, pathname, router]);

  if (openDemo) {
    if (status === "loading") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4">
          <div className="w-full max-w-sm rounded-lg border border-shohoz-line bg-white p-6 text-center">
            <p className="text-sm font-semibold text-shohoz">Shohoz Software</p>
            <p className="mt-2 text-sm text-shohoz-body">Opening invoice workspace…</p>
            {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-shohoz"
              onClick={() => {
                clearError();
                void refreshSession();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4">
        <div className="w-full max-w-sm rounded-lg border border-shohoz-line bg-white p-6 text-center">
          <p className="text-sm font-semibold text-shohoz">Shohoz Software</p>
          <p className="mt-2 text-sm text-shohoz-body">Restoring your session…</p>
          {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-shohoz"
            onClick={() => {
              clearError();
              void refreshSession();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4">
        <p className="text-sm text-shohoz-muted">Redirecting to sign in…</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const openDemo = isAuthDisabled();

  useEffect(() => {
    // Login/register temporarily unused — send everyone to the dashboard.
    if (openDemo || status === "authenticated") router.replace("/dashboard");
  }, [openDemo, status, router]);

  if (openDemo || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4">
        <p className="text-sm text-shohoz-muted">{openDemo ? "Redirecting to dashboard…" : "Checking session…"}</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4">
        <p className="text-sm text-shohoz-muted">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
