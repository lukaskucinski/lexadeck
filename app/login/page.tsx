import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUser()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="type-display text-4xl">
          lexadeck<span className="text-coral">.</span>
        </h1>
        <p className="label-caps mt-3 text-muted">Private study room</p>
        <LoginForm />
      </div>
    </div>
  );
}
