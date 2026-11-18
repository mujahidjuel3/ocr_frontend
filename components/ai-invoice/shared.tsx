import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="#00581d" />
        <rect x="8.5" y="6.5" width="15" height="19" rx="1.5" fill="none" stroke="white" strokeWidth="1.6" />
        <path d="M12 12.5h8M12 16.5h8M12 20.5h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="min-w-0 text-left">
        <span className="block truncate text-sm font-semibold leading-none tracking-tight text-shohoz-ink">Shohoz Software</span>
        {tagline ? (
          <span className="mt-1 hidden text-[11px] leading-none text-shohoz-muted sm:block">Smart Business | Smarter Software</span>
        ) : null}
      </span>
    </span>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-8", className)}>{children}</div>;
}

export function Section({
  id,
  titleId,
  children,
  className,
}: {
  id: string;
  titleId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={titleId} className={cn("scroll-mt-20 py-8 sm:py-10", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionIntro({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-shohoz">{eyebrow}</p>
      <h2 id={id} className="mt-1 font-serif text-2xl font-semibold leading-tight tracking-tight text-shohoz-ink">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-shohoz-body">{children}</div>
    </div>
  );
}

export const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-shohoz px-4 text-sm font-semibold text-white transition-colors hover:bg-shohoz-dark";

export const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-shohoz ring-1 ring-shohoz/30 transition-colors hover:bg-shohoz-soft";
