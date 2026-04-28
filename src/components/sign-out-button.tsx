"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "icon" | "full";

export function SignOutButton({
  variant = "full",
  className,
  ariaLabel,
}: {
  variant?: Variant;
  className?: string;
  ariaLabel?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      // The browser supplies the current location prefix; using the relative
      // path lets NextAuth prepend basePath correctly under subpath deploys.
      await signOut({ callbackUrl: "/login" });
    });
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handle}
        disabled={pending}
        aria-label={ariaLabel || "Sign out"}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-50",
          className
        )}
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={cn(
        "mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold hover:bg-accent disabled:opacity-50",
        className
      )}
    >
      <LogOut className="h-3.5 w-3.5" /> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
