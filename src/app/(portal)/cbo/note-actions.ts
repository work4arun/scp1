"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCBO } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { friendlyPrismaError } from "@/lib/prisma-errors";

const FORBIDDEN_MSG = "Your session is no longer valid or you don't have permission. Please sign in again.";

async function ensureCbo() {
  const session = await auth();
  if (!isCBO(session?.user.systemRole) || !session?.user.id) return { ok: false, error: FORBIDDEN_MSG };
  return { ok: true, userId: session.user.id } as const;
}

export type NoteResult = { success: true } | { success: false; error: string };

export async function addTextNoteAction(taskId: string, text: string): Promise<NoteResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  const userId = authed.userId!;
  if (!text.trim()) return { success: false, error: "Text cannot be empty." };

  try {
    await prisma.cboNote.create({ data: { taskId, authorId: userId, kind: "text", text: text.trim() } });
  } catch (err) { console.error("[addTextNoteAction]", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not save note." }; }
  revalidatePath("/cbo"); revalidatePath("/cbo/tasks/[id]", "page"); revalidatePath("/sm/notes");
  return { success: true };
}

export async function addVoiceNoteAction(taskId: string, audioBase64: string, mimeType: string, durationS: number): Promise<NoteResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  const userId = authed.userId!;
  if (!audioBase64) return { success: false, error: "No audio data provided." };

  try {
    const audioBytes = Buffer.from(audioBase64, "base64");
    await prisma.cboNote.create({ data: { taskId, authorId: userId, kind: "voice", audioBytes, audioMime: mimeType, audioDurationS: Math.round(durationS) } });
  } catch (err) { console.error("[addVoiceNoteAction]", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not save voice note." }; }
  revalidatePath("/cbo"); revalidatePath("/cbo/tasks/[id]", "page"); revalidatePath("/sm/notes");
  return { success: true };
}

export async function deleteNoteAction(noteId: string): Promise<NoteResult> {
  const authed = await ensureCbo();
  if (!authed.ok) return { success: false, error: authed.error };
  try { await prisma.cboNote.delete({ where: { id: noteId } }); } catch (err) { console.error("[deleteNoteAction]", err); return { success: false, error: friendlyPrismaError(err) ?? "Could not delete note." }; }
  revalidatePath("/cbo"); revalidatePath("/sm/notes");
  return { success: true };
}