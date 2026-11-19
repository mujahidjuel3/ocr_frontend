import { redirect } from "next/navigation";

/*
 * Login temporarily disabled for open demo / production soft-launch.
 * Restore by uncommenting the GuestGuard + LoginForm block below and
 * setting NEXT_PUBLIC_AUTH_DISABLED=false (and backend AUTH_DISABLED=false).
 *
 * import { Suspense } from "react";
 * import { GuestGuard } from "@/components/auth/AuthGuard";
 * import { LoginForm } from "@/components/auth/LoginForm";
 *
 * export default function LoginPage() {
 *   return (
 *     <GuestGuard>
 *       <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4 py-10">
 *         <Suspense fallback={<p className="text-sm text-shohoz-muted">Loading…</p>}>
 *           <LoginForm />
 *         </Suspense>
 *       </div>
 *     </GuestGuard>
 *   );
 * }
 */

export default function LoginPage() {
  redirect("/dashboard");
}
