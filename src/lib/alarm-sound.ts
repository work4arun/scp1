// ─────────────────────────────────────────────────────────────────────────────
//  Alarm sound — pure Web Audio API, no asset file required.
// ─────────────────────────────────────────────────────────────────────────────
//  Plays a short two-tone beep sequence when called. We synthesize the audio
//  on the fly so there's no MP3 to host or load. The function is a no-op on
//  the server, in browsers without AudioContext, or when the user has muted
//  alarms via setAlarmMuted(true).
//
//  Browser autoplay policies require a prior user gesture before audio works.
//  Since the timer is created by clicking the Start button, that gesture has
//  already happened — we're allowed to play sound from a setTimeout / setState
//  trigger that follows it.
// ─────────────────────────────────────────────────────────────────────────────

const MUTED_KEY = "startos:alarm-muted";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Must be called from inside a real user-gesture handler (a click, keypress).
 * Browsers refuse to play audio that originates from a setTimeout/setInterval
 * unless the AudioContext was first unlocked while a gesture was in flight.
 *
 * Call this from the Start-timer button's onClick. It plays an effectively
 * silent sample to "warm up" the context — after this point the looping chime
 * fires correctly even though it's coming from a setInterval callback later.
 */
export function primeAudioContext(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0.0001; // effectively inaudible
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.01);
  } catch {
    /* swallow */
  }
}

export function isAlarmMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAlarmMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) window.localStorage.setItem(MUTED_KEY, "1");
    else window.localStorage.removeItem(MUTED_KEY);
  } catch {
    /* localStorage blocked — no-op */
  }
}

/**
 * Play a short alarm chime: three rising beeps. ~1.2s total.
 * Returns a promise that resolves once the schedule is queued (not when audio
 * finishes). Errors are swallowed — alarm sound failures must never break the
 * UI.
 */
export function playAlarmSound(): void {
  if (isAlarmMuted()) return;
  const audio = getContext();
  if (!audio) return;

  // Some browsers suspend the context until a user gesture; resume just in case.
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }

  try {
    const now = audio.currentTime;
    // Three beeps: 880Hz (A5), 988Hz (B5), 1175Hz (D6) — pleasant rising arpeggio.
    const tones: Array<{ freq: number; offset: number; duration: number }> = [
      { freq: 880,  offset: 0.00, duration: 0.18 },
      { freq: 988,  offset: 0.22, duration: 0.18 },
      { freq: 1175, offset: 0.44, duration: 0.42 },
    ];
    for (const t of tones) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = t.freq;
      // Soft attack/decay so it doesn't click.
      gain.gain.setValueAtTime(0.0001, now + t.offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.offset + t.duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + t.offset);
      osc.stop(now + t.offset + t.duration + 0.05);
    }
  } catch {
    /* swallow */
  }
}

/**
 * Best-effort desktop notification when a timer fires. Requests permission
 * lazily on the first call. If denied or unsupported it's a no-op.
 */
export async function notifyAlarm(title: string, body: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") {
      // Fire-and-forget — we don't want to block the alarm sound on the prompt.
      Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body, silent: false, tag: "startos-timer" });
    }
  } catch {
    /* swallow */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Loop scheduler — keep the chime ringing until manually stopped.
// ─────────────────────────────────────────────────────────────────────────────
//  startAlarmLoop(id) plays the chime immediately, then again every
//  LOOP_INTERVAL_MS until stopAlarmLoop(id) is called. Idempotent — calling
//  start twice with the same id is a no-op.
//
//  We deliberately don't auto-cap the loop: the user explicitly asked for
//  "until stopped". The loop is naturally cleaned up when the page unloads
//  or when the chip's ✕ button calls stopAlarmLoop().
// ─────────────────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 2500; // chime every 2.5 seconds

const activeLoops = new Map<string, ReturnType<typeof setInterval>>();

export function startAlarmLoop(id: string): void {
  if (typeof window === "undefined") return;
  if (activeLoops.has(id)) return; // already looping
  // Fire the first beep immediately so the user hears it the instant the
  // timer expires, then schedule subsequent beeps.
  playAlarmSound();
  const handle = setInterval(() => {
    if (isAlarmMuted()) return; // don't play but keep the loop alive in case unmuted
    playAlarmSound();
  }, LOOP_INTERVAL_MS);
  activeLoops.set(id, handle);
}

export function stopAlarmLoop(id: string): void {
  const handle = activeLoops.get(id);
  if (handle) {
    clearInterval(handle);
    activeLoops.delete(id);
  }
}

export function stopAllAlarmLoops(): void {
  for (const handle of activeLoops.values()) clearInterval(handle);
  activeLoops.clear();
}

export function isLooping(id: string): boolean {
  return activeLoops.has(id);
}
