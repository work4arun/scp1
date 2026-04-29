"use client";

import { PortalError } from "@/components/portal-error";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PortalError area="the Super Admin portal" error={error} reset={reset} />;
}
