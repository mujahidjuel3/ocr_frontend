"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function RegisterForm() {
  const { register, error, clearError } = useAuth();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setLocalError("");
    clearError();
    if (tenantName.trim().length < 2 || name.trim().length < 2) {
      setLocalError("Business name and your name must be at least 2 characters.");
      return;
    }
    if (password.length < 10) {
      setLocalError("Password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await register({ tenantName, name, email, password });
      router.replace("/dashboard");
    } catch {
      // Error text comes from AuthProvider.
    } finally {
      setBusy(false);
    }
  }

  const message = localError || error;

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-shohoz-line bg-white p-6 shadow-sm" noValidate>
      <p className="text-sm font-semibold text-shohoz">Shohoz Software</p>
      <h1 className="mt-1 text-xl font-semibold text-shohoz-ink">Create a business</h1>
      <p className="mt-1 text-sm text-shohoz-body">Registers a tenant and the first user for AI Invoice Management.</p>
      {message ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{message}</p> : null}
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium">
          Business name
          <input className={fieldClass} value={tenantName} onChange={(event) => setTenantName(event.target.value)} required minLength={2} />
        </label>
        <label className="text-sm font-medium">
          Your name
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" />
        </label>
        <label className="text-sm font-medium">
          Email
          <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
        </label>
        <label className="text-sm font-medium">
          Password
          <input className={fieldClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={busy} className="rounded-md bg-shohoz px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Creating account…" : "Create account"}
        </button>
      </div>
      <p className="mt-4 text-sm text-shohoz-body">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-shohoz">
          Sign in
        </Link>
      </p>
    </form>
  );
}

const fieldClass = "mt-1 w-full rounded-md border border-shohoz-line bg-white px-3 py-2 text-sm";
