"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 text-destructive grid place-items-center text-xl font-bold mb-4">!</div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
        </div>
      </div>
    </div>
  );
}
