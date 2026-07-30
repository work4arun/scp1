"use client";

// Remembers the last-used Static Pages view (folders vs by-vertical) per browser.
// Writes a cookie the server reads on a bare visit, so returning via the sidebar
// link restores the view without a client-side flash or redirect.

import { useEffect } from "react";

export function PagesViewMemory({ view }: { view: "folder" | "list" }) {
  useEffect(() => {
    document.cookie = `staticPagesView=${view}; path=/; max-age=31536000; samesite=lax`;
  }, [view]);
  return null;
}
