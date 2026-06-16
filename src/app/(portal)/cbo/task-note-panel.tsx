"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addTextNoteAction, addVoiceNoteAction, deleteNoteAction } from "./note-actions";
import { Trash2, Mic, Square, Play, Pause, MessageSquare, X, Send } from "lucide-react";

type CboNote = {
  id: string;
  kind: string;
  text: string | null;
  audioBase64: string | null;
  audioMime: string | null;
  audioDurationS: number | null;
  createdAt: Date;
  author: { name: string };
};

export function TaskNotePanel({
  taskId,
  notes,
  readOnly = false,
}: {
  taskId: string;
  notes: CboNote[];
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        {notes.length > 0 ? `${notes.length} note(s)` : readOnly ? "" : "Add note"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-3 min-w-[240px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">CBO Instructions</span>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-card"><X className="h-3 w-3" /></button>
          </div>

          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start gap-2 rounded border border-border bg-card p-2">
                  <div className="min-w-0 flex-1">
                    {n.kind === "text" ? (
                      <p className="text-xs whitespace-pre-wrap">{n.text}</p>
                    ) : (
                      <VoicePlayer
                        audioBase64={n.audioBase64}
                        audioMime={n.audioMime ?? "audio/webm"}
                        durationS={n.audioDurationS}
                      />
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {n.author.name} · {new Date(n.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  {!readOnly && <DeleteNoteBtn noteId={n.id} />}
                </div>
              ))}
            </div>
          )}

          {readOnly && notes.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No instructions from CBO yet.</p>
          )}

          {/* Add text/voice — only for CBO */}
          {!readOnly && (
            <>
              <AddTextNote taskId={taskId} />
              <AddVoiceNote taskId={taskId} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Text Note (CBO only) ──
function AddTextNote({ taskId }: { taskId: string }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      const r = await addTextNoteAction(taskId, text);
      if (!r.success) { setError(r.error); return; }
      setText(""); setError(null);
    });
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type an instruction…"
        className="text-xs min-h-[50px]"
        disabled={pending}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" disabled={pending || !text.trim()} onClick={submit} className="text-xs h-7">
        {pending ? "…" : "Add text note"}
      </Button>
    </div>
  );
}

// ── Add Voice Note (CBO only) ──
function AddVoiceNote({ taskId }: { taskId: string }) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [pending, startTransition] = useTransition();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function startRecording() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        clearTimer();
        const actualDuration = Math.round((Date.now() - startTimeRef.current) / 1000) || 1;
        setRecordedDuration(actualDuration);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setPreviewBlob(blob);
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 200);
      mr.start();
      setState("recording");
    } catch {
      setError("Microphone access denied. Please allow microphone access in your browser settings.");
    }
  }

  function stopRecording() { mediaRecorderRef.current?.stop(); }

  async function submitRecording() {
    if (!previewBlob) return;
    const base64 = await blobToBase64(previewBlob);
    startTransition(async () => {
      const r = await addVoiceNoteAction(taskId, base64, previewBlob.type, recordedDuration);
      if (!r.success) { setError(r.error); return; }
      setPreviewBlob(null); setRecordedDuration(0); setState("idle");
    });
  }

  function cancelPreview() {
    setPreviewBlob(null); setRecordedDuration(0); setElapsed(0); setState("idle");
  }

  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  function togglePreviewPlay() {
    if (!previewBlob) return;
    if (!previewAudioRef.current) {
      const url = URL.createObjectURL(previewBlob);
      const a = new Audio(url);
      a.onended = () => setPreviewPlaying(false);
      previewAudioRef.current = a;
    }
    if (previewPlaying) { previewAudioRef.current.pause(); setPreviewPlaying(false); }
    else { previewAudioRef.current.play().catch(() => setPreviewPlaying(false)); setPreviewPlaying(true); }
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-destructive font-medium animate-pulse">🔴 Recording {elapsed}s</span>
        <Button size="sm" variant="destructive" onClick={stopRecording} className="text-xs h-7">
          <Square className="h-3 w-3 mr-1" /> Stop
        </Button>
      </div>
    );
  }

  if (state === "preview" && previewBlob) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={togglePreviewPlay} className="text-xs h-7">
          {previewPlaying ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Play ({recordedDuration}s)</>}
        </Button>
        <Button size="sm" onClick={submitRecording} disabled={pending} className="text-xs h-7">
          <Send className="h-3 w-3 mr-1" /> {pending ? "Saving…" : "Submit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelPreview} disabled={pending} className="text-xs h-7">
          <X className="h-3 w-3 mr-1" /> Discard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={startRecording} disabled={pending} className="text-xs h-7">
        <Mic className="h-3 w-3 mr-1" /> Record voice
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

// ── Voice Player ──
function VoicePlayer({ audioBase64, audioMime, durationS }: { audioBase64: string | null; audioMime: string; durationS: number | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    if (!audioBase64) return;
    if (!audioRef.current) {
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: audioMime });
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => setPlaying(false);
      audioRef.current = a;
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => setPlaying(false)); setPlaying(true); }
  }

  return (
    <button onClick={toggle} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      {playing ? "Playing…" : `Play voice note${durationS ? ` (${durationS}s)` : ""}`}
    </button>
  );
}

// ── Delete Note (CBO only) ──
function DeleteNoteBtn({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();
  function del() {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => { await deleteNoteAction(noteId); });
  }
  return <Button variant="ghost" size="sm" disabled={pending} onClick={del} className="h-6 w-6 p-0"><Trash2 className="h-3 w-3 text-destructive" /></Button>;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}