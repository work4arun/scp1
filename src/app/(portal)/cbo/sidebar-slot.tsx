"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Renders page-owned content into the app shell's sidebar.
//
//  The sidebar lives in the portal layout, which is a parent of every page, so a
//  page can't pass anything into it through props. This portals into the
//  `#sidebar-slot` div the shell reserves — meaning the content appears only on
//  the page that renders this component, and disappears on navigation away.
//
//  The portal target only exists on lg+ (the shell hides the sidebar below that),
//  so callers should render their own inline fallback for small screens.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SidebarSlot({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("sidebar-slot"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
