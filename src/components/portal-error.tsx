"use client";

// Shared error UI used by every per-portal error.tsx.
// Stays neutral and friendly so a single broken page doesn't read as a global outage.

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RotateCw } from "lucide-react";

export function PortalError({
  area,
  error,
  reset,
}: {
  area: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the error to the console for the engineer; render a calm message
  // for the operator. Digest (when present) is a stable id we can search the
  // server logs by.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.error(`[portal-error/${area}]`, error);
  }

  return (
    <div className="py-8">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Something went wrong in {area}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            The rest of the app is still available — only this section failed to load. Try again, or
            head back to your home page.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Reference: <code className="rounded bg-background px-1 py-0.5 font-mono">{error.digest}</code>
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={reset} size="sm">
              <RotateCw className="h-4 w-4" /> Try again
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/">Go home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
