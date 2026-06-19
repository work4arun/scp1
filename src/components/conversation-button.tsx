"use client";

import Link from "next/link";
import { MessageSquare, Mic } from "lucide-react";

export function ConversationButton({
  taskId,
  baseUrl,
  textCount,
  voiceCount,
}: {
  taskId: string;
  baseUrl: string; // e.g., "/sm/tasks" or "/cbo"
  textCount: number;
  voiceCount: number;
}) {
  const hasNew = textCount > 0 || voiceCount > 0;

  return (
    <Link
      href={`${baseUrl}/${taskId}?chat=1#conversation-section`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:border-primary/40 shrink-0"
      title="Open conversation"
    >
      <MessageSquare className={`h-3.5 w-3.5 ${hasNew ? "text-primary" : "text-muted-foreground"}`} />
      {hasNew ? (
        <span className="flex items-center gap-1">
          {textCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {textCount}
            </span>
          )}
          {voiceCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Mic className="h-3 w-3" />
              {voiceCount}
            </span>
          )}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Chat</span>
      )}
    </Link>
  );
}