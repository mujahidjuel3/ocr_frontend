"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { safeReturnPath } from "@/lib/auth/session";

export function LoginForm() {
  const { login, error, clearError } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setLocalError("");
    clearError();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError("Enter your email and password.");
      return;
    }
    if (password.length < 1) {
      setLocalError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      await login(trimmedEmail, password);
      router.replace(safeReturnPath(params.get("next")));
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
      <h1 className="mt-1 text-xl font-semibold text-shohoz-ink">Sign in</h1>
      <p className="mt-1 text-sm text-shohoz-body">AI Invoice Management for your Shohoz POS business.</p>
      {message ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{message}</p> : null}
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium text-shohoz-ink">
          Email
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="text-sm font-medium text-shohoz-ink">
          Password
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={1}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-shohoz px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
      <p className="mt-4 text-sm text-shohoz-body">
        Need an account?{" "}
        <Link href="/register" className="font-semibold text-shohoz">
          Create a business account
        </Link>
      </p>
    </form>
  );
}

const fieldClass = "mt-1 w-full rounded-md border border-shohoz-line bg-white px-3 py-2 text-sm";
