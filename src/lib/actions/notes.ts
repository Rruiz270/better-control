"use server";

import { db } from "@/db";
import { notes, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/authorization";

export async function getNotesByEntity(
  entityType: "project" | "task",
  entityId: string
) {
  return db
    .select({
      id: notes.id,
      entityType: notes.entityType,
      entityId: notes.entityId,
      content: notes.content,
      audioUrl: notes.audioUrl,
      transcription: notes.transcription,
      createdAt: notes.createdAt,
      userId: notes.userId,
      userName: users.name,
    })
    .from(notes)
    .innerJoin(users, eq(notes.userId, users.id))
    .where(
      and(eq(notes.entityType, entityType), eq(notes.entityId, entityId))
    )
    .orderBy(desc(notes.createdAt));
}

export async function createNote(data: {
  entityType: "project" | "task";
  entityId: string;
  content?: string;
  audioUrl?: string;
  transcription?: string;
}) {
  const session = await requireSession();
  const [note] = await db
    .insert(notes)
    .values({ ...data, userId: session.user.id })
    .returning();

  revalidatePath("/", "layout");
  return note;
}

export async function deleteNote(noteId: string) {
  await requireSession();
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath("/", "layout");
}
