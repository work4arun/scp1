"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type NotifItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  refId: string | null;
  createdAt: string;
};

const POLL_INTERVAL_MS = 8000;
const TOAST_TTL_MS = 6000;
const STORAGE_SOUND_KEY = "scp_notify_sound";

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [toasts, setToasts] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [openInbox, setOpenInbox] = useState(false);
  const [inbox, setInbox] = useState<NotifItem[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastPollRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Read sound preference once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(STORAGE_SOUND_KEY);
    if (v === "off") setSoundOn(false);
  }, []);
  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s;
      try { window.localStorage.setItem(STORAGE_SOUND_KEY, next ? "on" : "off"); } catch {}
      return next;
    });
  };

  const playChime = useCallback(() => {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      // Resume if suspended (autoplay policies)
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        g.gain.setValueAtTime(0.0001, now + start);
        g.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.05);
      };
      // Soft two-note chime — E5 then G5
      playTone(659.25, 0, 0.18, 0.15);
      playTone(783.99, 0.12, 0.28, 0.12);
    } catch { /* audio not available */ }
  }, [soundOn]);

  const dismissToast = useCallback((id: string) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const markSeen = useCallback(async (ids: string[] | "all") => {
    try {
      await fetch("/api/notifications/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch { /* */ }
  }, []);

  // Poll
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let firstRun = true;

    const tick = async () => {
      try {
        const url = lastPollRef.current
          ? `/api/notifications?since=${encodeURIComponent(lastPollRef.current)}`
          : "/api/notifications";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as { items: NotifItem[]; now: string; notReady?: boolean };
        if (cancelled) return;
        lastPollRef.current = data.now;
        if (data.notReady) return;

        // Filter out anything we already showed
        const fresh = data.items.filter((i) => !seenIdsRef.current.has(i.id));
        if (fresh.length === 0) return;
        fresh.forEach((i) => seenIdsRef.current.add(i.id));

        // Update unread count + inbox
        setUnread((c) => c + fresh.length);
        setInbox((curr) => [...fresh, ...curr].slice(0, 50));

        // On first run, don't toast/chime old unseen — just count them
        if (firstRun) { firstRun = false; return; }

        // Show as toasts (newest first, max 4 stacked)
        setToasts((curr) => [...fresh.slice(0, 4), ...curr].slice(0, 4));
        playChime();

        // Auto-dismiss each toast
        fresh.forEach((i) => {
          setTimeout(() => dismissToast(i.id), TOAST_TTL_MS);
        });
      } catch { /* */ }
    };

    // First poll immediately, then on interval
    tick();
    const handle = setInterval(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(handle); };
  }, [enabled, dismissToast, playChime]);

  if (!enabled) return null;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => {
          const next = !openInbox;
          setOpenInbox(next);
          if (next && inbox.length > 0) {
            // mark inbox as seen on open
            markSeen(inbox.map((i) => i.id));
            setUnread(0);
          }
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Inbox dropdown */}
      {openInbox && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenInbox(false)}>
          <div className="absolute right-3 top-14 lg:right-6 lg:top-6 w-[92vw] max-w-sm rounded-xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold">Notifications</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSound}
                  className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent text-muted-foreground"
                  title={soundOn ? "Mute sound" : "Enable sound"}
                  aria-label={soundOn ? "Mute notification sound" : "Enable notification sound"}
                >
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button onClick={() => setOpenInbox(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {inbox.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  You're all caught up.
                </div>
              ) : (
                inbox.map((n) => (
                  <NotificationRow key={n.id} n={n} onClick={() => setOpenInbox(false)} />
                ))
              )}
            </div>
            {inbox.length > 0 && (
              <div className="border-t border-border p-2 flex justify-end">
                <button
                  onClick={() => { markSeen("all"); setInbox([]); setUnread(0); setOpenInbox(false); }}
                  className="text-xs text-primary font-semibold hover:underline px-2 py-1"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast stack — top right */}
      <div className="fixed top-3 right-3 z-50 flex flex-col gap-2 w-[calc(100%-1.5rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </>
  );
}

function NotificationRow({ n, onClick }: { n: NotifItem; onClick?: () => void }) {
  const Wrapper = n.link
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={n.link!} onClick={onClick} className="block px-4 py-3 hover:bg-accent transition-colors">{children}</Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="px-4 py-3">{children}</div>
      );
  return (
    <Wrapper>
      <div className="flex items-start gap-3">
        <KindDot kind={n.kind} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{n.title}</div>
          {n.body ? <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div> : null}
          <div className="text-[10px] text-muted-foreground mt-1">{relTime(n.createdAt)}</div>
        </div>
      </div>
    </Wrapper>
  );
}

function Toast({ item, onDismiss }: { item: NotifItem; onDismiss: () => void }) {
  const Wrapper = item.link
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={item.link!} onClick={onDismiss} className="block">{children}</Link>
      )
    : ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card shadow-2xl animate-fade-in">
      <Wrapper>
        <div className="flex items-start gap-3 p-3">
          <KindDot kind={item.kind} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{item.title}</div>
            {item.body ? <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</div> : null}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-accent text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </Wrapper>
    </div>
  );
}

function KindDot({ kind }: { kind: string }) {
  const tone =
    kind.startsWith("task.escalated") || kind.includes("intervention") ? "destructive"
    : kind.startsWith("appointment") ? "primary"
    : kind.startsWith("task") ? "info"
    : kind.startsWith("boss") ? "warning"
    : "muted";
  const color = {
    destructive: "bg-destructive",
    primary: "bg-primary",
    info: "bg-sky-500",
    warning: "bg-warning",
    muted: "bg-muted-foreground",
  }[tone];
  return <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", color)} />;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
