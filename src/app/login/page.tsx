import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homePathForRole } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(homePathForRole(session.user.systemRole));

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-bold text-lg shadow-md">
            SCP
          </div>
          <h1 className="mt-4 text-xl font-bold">Strategic Control Portal</h1>
          <p className="mt-1 text-xs text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Suspense fallback={<div className="h-32 rounded-lg bg-muted/40 animate-pulse" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Strategic Control Portal
        </p>
      </div>
    </div>
  );
}
