/** Temporary open-demo flag. Keep in sync with backend AUTH_DISABLED. */
export function isAuthDisabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
}
