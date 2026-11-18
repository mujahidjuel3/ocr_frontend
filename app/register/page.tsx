import { GuestGuard } from "@/components/auth/AuthGuard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <div className="flex min-h-screen items-center justify-center bg-shohoz-mist px-4 py-10">
        <RegisterForm />
      </div>
    </GuestGuard>
  );
}
