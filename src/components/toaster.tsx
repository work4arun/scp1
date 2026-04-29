"use client";

// Lightweight toaster built on @radix-ui/react-toast.
// Exposes a global window.toast(message, opts) helper so server-action callers
// can surface ephemeral feedback without each component wiring up a context.
//
// Mounted only when the `toasts` feature flag is on (see (portal)/layout.tsx).

import * as Toast from "@radix-ui/react-toast";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type ToastEntry = { id: number; message: string; tone: Tone };

declare global {
  // eslint-disable-next-line no-var
  var __startosToast: ((message: string, opts?: { tone?: Tone }) => void) | undefined;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    let counter = 0;
    const push: NonNullable<typeof globalThis.__startosToast> = (message, opts) => {
      const id = ++counter;
      const tone = opts?.tone ?? "info";
      setToasts((curr) => [...curr, { id, message, tone }]);
    };
    globalThis.__startosToast = push;
    return () => {
      if (globalThis.__startosToast === push) globalThis.__startosToast = undefined;
    };
  }, []);

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) setToasts((curr) => curr.filter((x) => x.id !== t.id));
          }}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-lg",
            t.tone === "success" && "border-success/40",
            t.tone === "error" && "border-destructive/40",
            t.tone === "info" && "border-border",
          )}
        >
          {t.tone === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
          {t.tone === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
          {t.tone === "info" && <Info className="h-4 w-4 shrink-0 text-primary" />}
          <Toast.Description className="flex-1">{t.message}</Toast.Description>
          <Toast.Close className="rounded p-0.5 text-muted-foreground hover:bg-accent" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none lg:bottom-6" />
    </Toast.Provider>
  );
}

/**
 * Helper for client components — synchronous because the toaster is mounted
 * once globally. Falls back to console when the toaster is unmounted (e.g.,
 * the feature flag is OFF).
 */
export function toast(message: string, opts?: { tone?: Tone }) {
  if (typeof window === "undefined") return;
  if (globalThis.__startosToast) globalThis.__startosToast(message, opts);
  else console.log("[toast]", message, opts);
}
