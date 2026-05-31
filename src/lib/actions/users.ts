"use server";

import { db } from "@/db";
import { users, areas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  isAdmin,
  AuthorizationError,
  type SessionUser,
} from "@/lib/authorization";

type Role = "admin" | "head" | "member";

async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) {
    throw new AuthorizationError("Apenas admins gerenciam usuários.");
  }
  return session;
}

export async function listUsers() {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      areaId: users.areaId,
      areaName: areas.name,
    })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id))
    .orderBy(users.name);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  areaId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const email = data.email.trim().toLowerCase();
  if (!data.name.trim() || !email || data.password.length < 6) {
    return { ok: false, error: "Nome, email e senha (mín. 6) são obrigatórios." };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { ok: false, error: "Já existe um usuário com este email." };

  const passwordHash = await hash(data.password, 12);
  await db.insert(users).values({
    name: data.name.trim(),
    email,
    passwordHash,
    role: data.role,
    areaId: data.areaId,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateUser(
  userId: string,
  data: { name?: string; email?: string; role?: Role; areaId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.role !== undefined) patch.role = data.role;
  if (data.areaId !== undefined) patch.areaId = data.areaId;
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (clash && clash.id !== userId) return { ok: false, error: "Email já usado por outro usuário." };
    patch.email = email;
  }

  await db.update(users).set(patch).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetUserPassword(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (password.length < 6) return { ok: false, error: "Senha mínima de 6 caracteres." };
  const passwordHash = await hash(password, 12);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true };
}
