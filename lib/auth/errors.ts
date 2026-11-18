export type AuthFailureKind =
  | "invalid_credentials"
  | "inactive"
  | "conflict"
  | "validation"
  | "unauthorized"
  | "network"
  | "server"
  | "unknown";

type FailureLike = { status: number; message: string };

function asFailure(reason: unknown): FailureLike | null {
  if (!reason || typeof reason !== "object") return null;
  const status = (reason as { status?: unknown }).status;
  const message = (reason as { message?: unknown }).message;
  if (typeof status !== "number" || typeof message !== "string") return null;
  return { status, message };
}

export function classifyAuthFailure(reason: unknown): { kind: AuthFailureKind; message: string } {
  const failure = asFailure(reason);
  if (!failure) {
    return { kind: "unknown", message: "Something went wrong. Please try again." };
  }

  const text = failure.message.trim();
  const lower = text.toLowerCase();

  if (failure.status === 0) {
    return { kind: "network", message: text || "The invoice service could not be reached. Check your connection and try again." };
  }
  if (failure.status === 401) {
    if (lower.includes("inactive")) {
      return { kind: "inactive", message: text || "This account is inactive. Contact your administrator." };
    }
    if (lower.includes("invalid") || lower.includes("password") || lower.includes("email")) {
      return { kind: "invalid_credentials", message: text || "Invalid email or password." };
    }
    return { kind: "unauthorized", message: text || "Your session is no longer valid. Please sign in again." };
  }
  if (failure.status === 403 && lower.includes("inactive")) {
    return { kind: "inactive", message: text || "This account is inactive. Contact your administrator." };
  }
  if (failure.status === 409) {
    return { kind: "conflict", message: text || "An account with this email already exists." };
  }
  if (failure.status === 400 || failure.status === 422) {
    return { kind: "validation", message: text || "Check the form fields and try again." };
  }
  if (failure.status >= 500) {
    return { kind: "server", message: text || "The server could not complete the request. Please try again shortly." };
  }
  return { kind: "unknown", message: text || "Something went wrong. Please try again." };
}

export function isUnauthorizedStatus(status: number): boolean {
  return status === 401;
}

export function isNetworkFailure(reason: unknown): boolean {
  const failure = asFailure(reason);
  return Boolean(failure && failure.status === 0);
}
