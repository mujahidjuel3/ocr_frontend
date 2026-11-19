import { redirect } from "next/navigation";

/*
 * Registration temporarily disabled for open demo / production soft-launch.
 * Restore by uncommenting the GuestGuard + RegisterForm block below and
 * setting NEXT_PUBLIC_AUTH_DISABLED=false (and backend AUTH_DISABLED=false).
 *
 * import { GuestGuard } from "@/components/auth/AuthGuard";
 * import { RegisterForm } from "@/components/auth/RegisterForm";
 *
 * export default function RegisterPage() {
 *   return (
 *     <GuestGuard>
 *       <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4 py-10">
 *         <RegisterForm />
 *       </div>
 *     </GuestGuard>
 *   );
 * }
 */

export default function RegisterPage() {
  redirect("/dashboard");
}
