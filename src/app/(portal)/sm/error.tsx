"use client";

import { PortalError } from "@/components/portal-error";

export default function SmError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PortalError area="the Strategic Manager portal" error={error} reset={reset} />;
}
