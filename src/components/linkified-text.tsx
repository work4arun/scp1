// ─────────────────────────────────────────────────────────────────────────────
//  Linkified text — turns URLs inside follow-up notes into clickable links.
//
//  SMs paste SharePoint / Drive links into their updates; the CBO needs to open
//  them straight from the register. Everything is still rendered as React text
//  nodes, so the note content itself is never treated as markup.
//
//  Only http(s) and bare www. links are matched, so a "javascript:" payload
//  pasted into a note can never become an anchor.
// ─────────────────────────────────────────────────────────────────────────────

import { ExternalLink } from "lucide-react";

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/** Trailing punctuation that ends a sentence rather than the URL. */
const TRAILING = /[.,;:!?'"]+$/;

export function LinkifiedText({ text, className = "" }: { text: string; className?: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let raw = match[0];

    // Drop sentence punctuation stuck to the end, and any unbalanced closing
    // bracket — "(see https://x.com/a)" should not swallow the paren.
    raw = raw.replace(TRAILING, "");
    while (/[)\]}]$/.test(raw)) {
      const close = raw.slice(-1);
      const open = close === ")" ? "(" : close === "]" ? "[" : "{";
      const balanced = raw.split(open).length - 1 >= raw.split(close).length - 1;
      if (balanced) break;
      raw = raw.slice(0, -1);
    }
    if (!raw) continue;

    if (start > cursor) nodes.push(text.slice(cursor, start));

    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    nodes.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline break-all font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {raw}
        <ExternalLink className="ml-0.5 inline h-2.5 w-2.5 align-baseline" />
      </a>,
    );
    cursor = start + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <div className={className}>{nodes}</div>;
}
