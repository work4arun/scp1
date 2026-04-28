"use client";

import { useEffect } from "react";
import { markSeenAction } from "./actions";

export function MarkSeenOnLoad() {
  useEffect(() => {
    // Fire-and-forget. We don't want to block UI.
    markSeenAction().catch(() => {});
  }, []);
  return null;
}
