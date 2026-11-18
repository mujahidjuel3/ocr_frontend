"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { navLinks } from "./data";
import { Logo, primaryLinkClass } from "./shared";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-shohoz-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <a href="#top" className="min-w-0 rounded-md" onClick={close}>
          <Logo />
        </a>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-shohoz-body transition-colors hover:text-shohoz">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a href="#demo" className={primaryLinkClass} onClick={close}>
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Request a Demo</span>
          </a>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-shohoz-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      <nav id="mobile-nav" aria-label="Mobile" className={open ? "border-t border-shohoz-line px-4 py-2 lg:hidden" : "hidden"}>
        <ul>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="flex min-h-11 items-center text-sm font-medium text-shohoz-ink" onClick={close}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
