"use client";

import { PortalError } from "@/components/portal-error";

export default function CboError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PortalError area="the CBO portal" error={error} reset={reset} />;
}
