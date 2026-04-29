"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Notes panel — compose (text + audio) and view sent history.
// ─────────────────────────────────────────────────────────────────────────────
//  Audio recording uses the browser-built-in MediaRecorder API. We capture
//  the user's microphone via getUserMedia, record an opus-in-webm blob,
//  preview it locally, then upload as multipart FormData to /api/notes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Send, Trash2, Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { formatRelative } from "@/lib/utils";

type NoteRow = {
  id: string;
  text: string | null;
  audioMime: string | null;
  audioDurationS: number | null;
  audienceRole: "SM" | "CBO" | "SUPER_ADMIN";
  createdAt: string;
  author: { name: string; email: string; systemRole: "SM" | "CBO" | "SUPER_ADMIN" };
};

const MAX_RECORDING_S = 60;

export function NotesPanel() {
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recStartRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [notes, setNotes] = useState<NoteRow[]>([]);

  // Load recent sent notes.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notes?box=sent", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok) setNotes(data.notes as NoteRow[]);
      } catch { /* ignore */ }
    }
    load();
  }, []);

  // Revoke any blob URLs we created so we don't leak memory.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick the most widely-supported codec.
      const mime = pickSupportedMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const elapsed = Math.round((Date.now() - recStartRef.current) / 1000);
        setAudioBlob(blob);
        setAudioUrl(url);
        setAudioDuration(elapsed);
        // Stop microphone capture.
        stream.getTracks().forEach((t) => t.stop());
      };

      recStartRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setRecElapsed(0);

      tickRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - recStartRef.current) / 1000);
        setRecElapsed(elapsed);
        // Auto-stop at the max length so we never push 6+ MB blobs.
        if (elapsed >= MAX_RECORDING_S) stopRecording();
      }, 250);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone access blocked.";
      setFeedback({ ok: false, msg: message });
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRecording(false);
  }

  function clearAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioDuration(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!text.trim() && !audioBlob) {
      setFeedback({ ok: false, msg: "Type a message or record a voice note before sending." });
      return;
    }
    setPending(true);
    setFeedback(null);
    const fd = new FormData();
    if (text.trim()) fd.append("text", text.trim());
    if (audioBlob) {
      fd.append("audio", audioBlob, "voice-note.webm");
      fd.append("audioDurationS", String(audioDuration));
    }
    fd.append("audienceRole", "SM");
    try {
      const res = await fetch("/api/notes", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedback({ ok: false, msg: data.error || `HTTP ${res.status}` });
      } else {
        setFeedback({ ok: true, msg: "Note sent — every Strategic Manager has been notified." });
        setText("");
        clearAudio();
        // Refresh list.
        setNotes((curr) => [data.note as NoteRow, ...curr].slice(0, 50));
      }
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Compose */}
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="note-text">Message</Label>
          <Textarea
            id="note-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type the message you want all SMs to see…"
            rows={4}
            disabled={pending}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Voice note (optional)
            </div>
            <div className="text-[11px] text-muted-foreground">Max {MAX_RECORDING_S} seconds</div>
          </div>

          {!audioUrl && !recording && (
            <Button type="button" variant="outline" onClick={startRecording} disabled={pending}>
              <Mic className="h-4 w-4" /> Start recording
            </Button>
          )}

          {recording && (
            <div className="flex items-center gap-3">
              <Button type="button" variant="destructive" onClick={stopRecording}>
                <MicOff className="h-4 w-4" /> Stop
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatSec(recElapsed)} / {formatSec(MAX_RECORDING_S)}
                </span>
              </div>
            </div>
          )}

          {audioUrl && !recording && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <audio src={audioUrl} controls className="w-full sm:flex-1" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={clearAudio} disabled={pending}>
                  <Trash2 className="h-4 w-4" /> Discard
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={startRecording} disabled={pending}>
                  <Mic className="h-4 w-4" /> Re-record
                </Button>
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
              feedback.ok
                ? "border-success/40 bg-success/5 text-success"
                : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            {feedback.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to all SMs
          </Button>
        </div>
      </form>

      {/* Sent history */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recently sent
        </div>
        {notes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            You haven't sent any notes yet.
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>To: All {n.audienceRole === "SM" ? "Strategic Managers" : n.audienceRole + "s"}</span>
                <span>{formatRelative(n.createdAt)}</span>
              </div>
              {n.text && <div className="mt-1.5 text-sm whitespace-pre-wrap">{n.text}</div>}
              {n.audioMime && (
                <div className="mt-2 flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  <audio src={`/api/notes/${n.id}/audio`} controls className="flex-1" />
                  {n.audioDurationS ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatSec(n.audioDurationS)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

function pickSupportedMime(): string | null {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}
