"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ChevronDown, ChevronUp, Mic, StopCircle } from "lucide-react";
import { sendSmMessageAction } from "./sm-chat-action";
import { useEffect } from "react";

interface Message {
  id: string;
  text: string | null;
  audioBytes: any;
  audioMime: string | null;
  audioDurationS: number | null;
  authorId: string;
  authorRole: string;
  author: { id: string; name: string };
  createdAt: Date;
}

export function SmTaskChat({
  taskId,
  messages: initialMessages,
  defaultOpen,
}: {
  taskId: string;
  messages: Message[];
  defaultOpen: boolean;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen) {
      setTimeout(() => {
        document.getElementById("sm-conversation-section")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [defaultOpen]);

  function scrollToBottom() {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function handleSend() {
    if (!text.trim() && !audioBlob) return;
    const form = new FormData();
    form.set("taskId", taskId);
    if (text.trim()) form.set("text", text);
    if (audioBlob) {
      form.set("audio", audioBlob, `voice-${Date.now()}.webm`);
      form.set("audioMime", audioBlob.type || "audio/webm");
    }

    startTransition(async () => {
      const result = await sendSmMessageAction(form);
      if (result.success) {
        setText("");
        setAudioBlob(null);
        setAudioUrl(null);
        router.refresh();
        scrollToBottom();
      }
    });
  }

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
    }).catch(() => alert("Microphone access denied."));
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  const formatTime = (d: Date) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <Card id="sm-conversation-section">
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="text-sm">
          SM Conversation {initialMessages.length > 0 && `(${initialMessages.length})`}
        </CardTitle>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-3">
          <div className="max-h-[400px] overflow-y-auto space-y-3 rounded-lg bg-muted/20 p-3">
            {initialMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No messages yet. Start the conversation with team members.</p>
            ) : (
              initialMessages.map((msg, idx) => {
                const isSM = msg.authorRole === "sm";
                const showDate = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(initialMessages[idx - 1].createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`flex ${isSM ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isSM ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                        <div className="text-[10px] font-semibold opacity-80 mb-0.5">
                          {isSM ? "You" : msg.author.name}
                          {!isSM && msg.authorRole === "member" && <span className="text-[9px] ml-1 opacity-60">(Member)</span>}
                        </div>
                        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                        {msg.audioBytes && (
                          <audio controls className="mt-1 max-w-full" style={{ height: 28 }}>
                            <source src={`data:${msg.audioMime || "audio/webm"};base64,${Buffer.from(msg.audioBytes).toString("base64")}`} />
                          </audio>
                        )}
                        <div className="text-[9px] opacity-60 mt-1 text-right">{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-2">
            {audioUrl && (
              <div className="flex items-center gap-2 text-xs">
                <audio controls src={audioUrl} style={{ height: 28 }} />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-destructive text-[10px]">✕ Remove</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="min-h-[40px] text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <div className="flex items-center gap-1">
                {!recording ? (
                  <Button type="button" variant="ghost" size="icon" onClick={startRecording} className="h-9 w-9" title="Record voice">
                    <Mic className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" variant="destructive" size="icon" onClick={stopRecording} className="h-9 w-9 animate-pulse" title="Stop recording">
                    <StopCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" size="icon" onClick={handleSend} disabled={pending || (!text.trim() && !audioBlob)} className="h-9 w-9">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}