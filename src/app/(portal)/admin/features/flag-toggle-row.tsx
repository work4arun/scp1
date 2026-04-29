"use client";

import { useState, useTransition } from "react";
import { toggleFeatureAction } from "./actions";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";

export function FlagToggleRow({
  flagKey,
  label,
  description,
  enabled,
  updatedAt,
  disabled,
}: {
  flagKey: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: Date | null;
  disabled?: boolean;
}) {
  const [optimistic, setOptimistic] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    if (disabled || pending) return;
    const next = !optimistic;
    setOptimistic(next);
    setError(null);
    startTransition(async () => {
      try {
        await toggleFeatureAction(flagKey, next);
      } catch (err) {
        setOptimistic(!next); // revert
        setError(err instanceof Error ? err.message : "Toggle failed");
      }
    });
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {flagKey}
          </code>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        {updatedAt && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            updated {formatRelative(updatedAt)}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || pending}
        aria-pressed={optimistic}
        aria-label={`${optimistic ? "Disable" : "Enable"} ${label}`}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          optimistic ? "bg-primary" : "bg-muted",
          (disabled || pending) && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform flex items-center justify-center",
            optimistic ? "translate-x-6" : "translate-x-1",
          )}
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : optimistic ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <X className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </button>
    </div>
  );
}
