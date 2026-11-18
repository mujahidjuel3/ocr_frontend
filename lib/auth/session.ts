/** Browser session helpers for the bearer access token. Prefer sessionStorage over localStorage. */

export const ACCESS_TOKEN_KEY = "shohoz.accessToken";
export const AUTH_CHANNEL = "shohoz.auth";

export type AuthBroadcast =
  | { type: "logout" }
  | { type: "login" }
  | { type: "expired" };

export function readAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  broadcast({ type: "login" });
}

export function clearAccessToken(reason: "logout" | "expired" = "logout"): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  broadcast({ type: reason });
}

export function subscribeAuthBroadcast(handler: (event: AuthBroadcast) => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }
  const channel = new BroadcastChannel(AUTH_CHANNEL);
  channel.onmessage = (message: MessageEvent<AuthBroadcast>) => {
    if (!message.data || typeof message.data !== "object") return;
    if (message.data.type === "logout" || message.data.type === "login" || message.data.type === "expired") {
      handler(message.data);
    }
  };
  return () => channel.close();
}

function broadcast(event: AuthBroadcast): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Cross-tab sync is best-effort.
  }
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register")) return "/dashboard";
  return value;
}
