"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { InvoiceDesk } from "./desk";

/** Authenticated shell that keeps invoice state mounted across section routes. */
export function InvoiceApp() {
  return (
    <AuthGuard>
      <AppShell>
        <InvoiceDesk />
      </AppShell>
    </AuthGuard>
  );
}
