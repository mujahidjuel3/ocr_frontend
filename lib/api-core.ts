export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiBaseUrl(value: string | undefined): string {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) throw new ApiError(0, "Set NEXT_PUBLIC_API_URL to the NestJS API origin.");
  return url;
}

export function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const text = message.filter((item): item is string => typeof item === "string").join(" ");
    if (text.trim()) return text;
  }
  return fallback;
}
