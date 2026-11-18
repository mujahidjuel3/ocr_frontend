"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { APP_NAV, sectionFromPath } from "@/lib/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, tenantName, logout } = useAuth();
  const pathname = usePathname();
  const active = sectionFromPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-shohoz-mist lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-shohoz-line bg-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="border-b border-shohoz-line px-4 py-4">
          <p className="text-sm font-semibold text-shohoz">Shohoz Software</p>
          <p className="text-xs text-shohoz-muted">AI Invoice Management</p>
        </div>
        <nav aria-label="Application" className="flex flex-1 flex-col gap-1 p-3">
          {APP_NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={
                active === item.id
                  ? "rounded-md bg-shohoz px-3 py-2 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-2 text-sm font-semibold text-shohoz-body hover:bg-shohoz-soft"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-shohoz-line p-4 text-sm">
          <p className="font-medium text-shohoz-ink">{user?.name || "—"}</p>
          <p className="text-shohoz-muted">{tenantName || "—"}</p>
          <button type="button" className="mt-3 text-sm font-semibold text-shohoz" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-shohoz-line bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-shohoz lg:hidden">Shohoz Software</p>
              <p className="truncate text-sm text-shohoz-body">{tenantName || "Your business"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-shohoz-line px-3 py-2 text-sm font-semibold text-shohoz-ink lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                onClick={() => setMobileOpen((open) => !open)}
              >
                Menu
              </button>
              <button type="button" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-shohoz sm:inline lg:hidden" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
          {mobileOpen ? (
            <nav id="mobile-nav" aria-label="Mobile" className="space-y-1 border-t border-shohoz-line px-3 py-3 lg:hidden">
              {APP_NAV.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={
                    active === item.id
                      ? "block rounded-md bg-shohoz px-3 py-2 text-sm font-semibold text-white"
                      : "block rounded-md px-3 py-2 text-sm font-semibold text-shohoz-body hover:bg-shohoz-soft"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
