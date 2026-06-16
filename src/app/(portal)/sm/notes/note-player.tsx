"use client";

import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

export function CboNotePlayer({
  audioBase64,
  audioMime,
  durationS,
}: {
  audioBase64: string | null;
  audioMime: string;
  durationS: number | null;
}) {
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
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {playing ? "Playing voice note…" : `Play voice note${durationS ? ` (${durationS}s)` : ""}`}
    </button>
  );
}