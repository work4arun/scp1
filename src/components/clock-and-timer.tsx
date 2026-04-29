"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Compact Clock + Timer strip (sits above Today's Briefing)
// ─────────────────────────────────────────────────────────────────────────────
//  Single shared 1-Hz ticker drives the IST clock AND every active timer chip,
//  so they all advance together every second. The clock shows HH:MM:SS, the
//  chips show MM:SS (or H:MM:SS for ≥1h), with the seconds rendered in a
//  contrast color so they're unmistakably alive.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Clock, Play, X, AlarmClock, BellRing, Loader2, Volume2, VolumeX } from "lucide-react";
import {
  notifyAlarm,
  isAlarmMuted,
  setAlarmMuted,
  startAlarmLoop,
  stopAlarmLoop,
  stopAllAlarmLoops,
  primeAudioContext,
  playAlarmSound,
} from "@/lib/alarm-sound";

type Timer = { id: string; label: string | null; fireAt: string; createdAt: string };

const PRESETS_MIN = [5, 15, 25, 30, 45, 60];
const POLL_INTERVAL_MS = 30_000;

// ────────── Top-level container ──────────

export function ClockAndTimer() {
  const [timers, setTimers] = useState<Timer[]>([]);
  // Timers that have crossed zero locally but haven't been dismissed yet.
  // Kept separate so the chip stays visible AFTER the server-side poll stops
  // returning them (server filter is `sent: false`, which we lose on firing).
  const [ringing, setRinging] = useState<Timer[]>([]);
  // Start null so the server-rendered HTML doesn't disagree with the client's
  // first render — the clock content only paints after mount.
  const [now, setNow] = useState<Date | null>(null);
  const [muted, setMuted] = useState<boolean>(false);

  // Read persisted mute preference once on mount.
  useEffect(() => {
    setMuted(isAlarmMuted());
  }, []);

  // ONE shared 1-Hz ticker. Set the initial time on mount, then advance every
  // second. Every child reads `now` so the IST clock and every timer chip
  // tick in lockstep.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Stop all chime loops on page unload. The browser would do this anyway when
  // the tab closes, but being explicit keeps things tidy on hot reload.
  useEffect(() => {
    return () => stopAllAlarmLoops();
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setAlarmMuted(next);
    // We don't tear down loops on mute — the loop checks `isAlarmMuted()` on
    // every tick and silently skips beeps. That way unmuting picks back up.
  }

  function dismissRinging(id: string) {
    stopAlarmLoop(id);
    setRinging((curr) => curr.filter((t) => t.id !== id));
    setTimers((curr) => curr.filter((t) => t.id !== id));
    // Best-effort server cancel (no-op if already sent).
    fetch(`/api/timers/${id}`, { method: "DELETE" }).catch(() => {});
  }

  // Poll the server every 30s so newly-fired/cancelled timers reconcile.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/timers", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) setTimers(data.timers as Timer[]);
      } catch {
        /* ignore — next poll will retry */
      }
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      className="reveal flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
      style={{ animationDelay: "30ms" }}
    >
      <IstClockPill now={now} />
      <TimerInline
        onCreated={(t) =>
          setTimers((curr) => [...curr, t].sort((a, b) => +new Date(a.fireAt) - +new Date(b.fireAt)))
        }
      />
      {now && (
        <ActiveTimers
          timers={mergeTimers(timers, ringing)}
          nowMs={now.getTime()}
          onTransitionFired={(t) =>
            setRinging((curr) => (curr.some((r) => r.id === t.id) ? curr : [...curr, t]))
          }
          onDismiss={dismissRinging}
        />
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            primeAudioContext();
            playAlarmSound();
          }}
          title="Test alarm sound"
          aria-label="Test alarm sound"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent"
        >
          Test 🔊
        </button>
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? "Alarm sound is muted — click to unmute" : "Mute alarm sound"}
          aria-label={muted ? "Unmute alarm" : "Mute alarm"}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
            muted ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-background hover:bg-accent"
          }`}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ────────── IST Clock pill — uses the shared `now` ──────────

function IstClockPill({ now }: { now: Date | null }) {
  // Server-render and the very first client render both show this skeleton
  // pill so the markup matches and we don't trip a hydration mismatch.
  if (!now) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
        suppressHydrationWarning
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="font-mono tabular-nums">--:--:--</span>
      </span>
    );
  }
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const parts = fmt.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "--";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "--";
  const second = parts.find((p) => p.type === "second")?.value ?? "--";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  const dateLine = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);
  const blink = now.getSeconds() % 2 === 0;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs">
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono font-bold tabular-nums leading-none">
        <span className="text-foreground">{hour}</span>
        <span className={`text-primary ${blink ? "opacity-100" : "opacity-30"}`}>:</span>
        <span className="text-foreground">{minute}</span>
        <span className={`text-primary ${blink ? "opacity-100" : "opacity-30"}`}>:</span>
        <span className="text-primary">{second}</span>
        <span className="ml-1 text-[10px] font-semibold text-primary">{dayPeriod}</span>
      </span>
      <span className="hidden text-muted-foreground sm:inline">·</span>
      <span className="hidden text-[11px] text-muted-foreground sm:inline">{dateLine} · IST</span>
    </span>
  );
}

// ────────── Inline timer-creation form ──────────

function TimerInline({ onCreated }: { onCreated: (t: Timer) => void }) {
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    if (pending || minutes < 1) return;
    // CRITICAL: prime the AudioContext while we're still inside the click
    // handler. Browsers tie audio playback permission to the most recent user
    // gesture; setInterval callbacks later cannot unlock audio on their own.
    primeAudioContext();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || null, durationSeconds: minutes * 60 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        onCreated(data.timer as Timer);
        setLabel("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={start} className="flex flex-1 flex-wrap items-center gap-1.5">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What's this for? (optional)"
        disabled={pending}
        maxLength={120}
        className="h-7 min-w-[140px] flex-1 rounded-md border border-border bg-background px-2 text-xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1">
        <button
          type="button"
          onClick={() => setMinutes((m) => Math.max(1, m - 5))}
          disabled={pending}
          className="h-6 w-6 rounded text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          aria-label="Decrease minutes"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) =>
            setMinutes(Math.max(1, Math.min(1440, parseInt(e.target.value || "0", 10) || 0)))
          }
          disabled={pending}
          className="h-6 w-10 border-0 bg-transparent p-0 text-center text-xs font-semibold tabular-nums focus-visible:outline-none"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">min</span>
        <button
          type="button"
          onClick={() => setMinutes((m) => Math.min(1440, m + 5))}
          disabled={pending}
          className="h-6 w-6 rounded text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          aria-label="Increase minutes"
        >
          +
        </button>
      </div>
      <div className="hidden gap-1 sm:flex">
        {PRESETS_MIN.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            disabled={pending}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              minutes === m
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-accent"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Start
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </form>
  );
}

// ────────── Active timer chips — receive `nowMs` from the parent tick ──────────

function ActiveTimers({
  timers,
  nowMs,
  onTransitionFired,
  onDismiss,
}: {
  timers: Timer[];
  nowMs: number;
  onTransitionFired: (t: Timer) => void;
  onDismiss: (id: string) => void;
}) {
  // Local guard: each id triggers the transition-to-fired side effect exactly
  // once. The PARENT keeps the actual ringing list; we only dispatch.
  const firedOnce = useRef<Set<string>>(new Set());

  // Detect the moment a chip transitions running → fired. We:
  //  1. tell the parent (so the chip persists after the next server poll), and
  //  2. start the looping chime + fire one desktop notification.
  useEffect(() => {
    for (const t of timers) {
      const fireMs = new Date(t.fireAt).getTime();
      const isFired = nowMs >= fireMs;
      if (isFired && !firedOnce.current.has(t.id)) {
        firedOnce.current.add(t.id);
        onTransitionFired(t);
        startAlarmLoop(t.id);
        notifyAlarm("⏰ Time's up", t.label || "Your timer has finished");
      }
    }
    // Garbage-collect ids no longer in the visible list.
    const liveIds = new Set(timers.map((t) => t.id));
    for (const id of firedOnce.current) {
      if (!liveIds.has(id)) firedOnce.current.delete(id);
    }
  }, [timers, nowMs, onTransitionFired]);

  if (timers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {timers.map((t) => {
        const fireMs = new Date(t.fireAt).getTime();
        const remaining = fireMs - nowMs;
        const justFired = remaining <= 0;
        const { mm, ss, h } = splitRemaining(remaining);
        return (
          <span
            key={t.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              justFired
                ? "border-destructive/60 bg-destructive/10 text-destructive animate-glow-pulse"
                : "border-warning/40 bg-warning/5 text-foreground"
            }`}
            title={
              t.label
                ? `${t.label} — fires at ${new Date(t.fireAt).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })} IST`
                : undefined
            }
          >
            {justFired ? (
              <BellRing className="h-3 w-3 animate-breathe" />
            ) : (
              <AlarmClock className="h-3 w-3 text-warning" />
            )}
            <span className="max-w-[140px] truncate">{t.label || "Timer"}</span>
            {justFired ? (
              <span className="font-mono">Time's up</span>
            ) : (
              <span className="font-mono tabular-nums leading-none">
                {h !== null && (
                  <>
                    <span>{h}</span>
                    <span className="text-muted-foreground">:</span>
                  </>
                )}
                <span>{mm}</span>
                <span className="text-muted-foreground">:</span>
                <span className="text-warning">{ss}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={justFired ? `Stop alarm for ${t.label || "timer"}` : `Cancel ${t.label || "timer"}`}
              title={justFired ? "Stop alarm" : "Cancel timer"}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

// ────────── helpers ──────────

function splitRemaining(ms: number): { mm: string; ss: string; h: string | null } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    h: h > 0 ? String(h) : null,
    mm: pad(m),
    ss: pad(s),
  };
}
function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Combine the live (server-returned) timers with the locally-ringing ones so
 * a chip persists on screen even after the server stops returning a fired row.
 * De-duplicates by id; running entries take precedence over a stale ringing copy.
 */
function mergeTimers(running: Timer[], ringing: Timer[]): Timer[] {
  const byId = new Map<string, Timer>();
  for (const r of ringing) byId.set(r.id, r);
  for (const t of running) byId.set(t.id, t); // running version wins
  return Array.from(byId.values()).sort((a, b) => +new Date(a.fireAt) - +new Date(b.fireAt));
}
