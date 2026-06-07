"use server";

import { db } from "@/db";
import { users, areas, userAreas } from "@/db/schema";
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
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      areaId: users.areaId,
      areaName: areas.name,
      status: users.status,
    })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id))
    .orderBy(users.name);
  // multi-área: anexa todas as áreas de cada usuário (fallback p/ a primária)
  const ua = await db.select().from(userAreas);
  const byUser = new Map<string, string[]>();
  for (const r of ua) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.areaId]);
  return rows.map((u) => ({ ...u, areaIds: byUser.get(u.id) ?? (u.areaId ? [u.areaId] : []) }));
}

/** Define as áreas (multi) de um usuário; primária = primeira da lista. */
export async function setUserAreas(userId: string, areaIds: string[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(userAreas).where(eq(userAreas.userId, userId));
  if (areaIds.length) await db.insert(userAreas).values(areaIds.map((areaId) => ({ userId, areaId })));
  await db.update(users).set({ areaId: areaIds[0] ?? null, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/", "layout");
  return { ok: true };
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

// --- Onboarding: convite → setup (público) → aprovação → boas-vindas ----------

/** Admin cria um convite: usuário "invited" com token. Retorna o link de setup. */
export async function createInvite(data: { name: string; role: Role; areaIds: string[] }): Promise<{ ok: boolean; link?: string; error?: string }> {
  await requireAdmin();
  if (!data.name.trim()) return { ok: false, error: "Nome é obrigatório." };
  const token = crypto.randomUUID().replace(/-/g, "");
  const passwordHash = await hash(crypto.randomUUID(), 12); // placeholder até o setup
  const [u] = await db.insert(users).values({
    name: data.name.trim(), email: `invite-${token}@pending.local`, passwordHash,
    role: data.role, areaId: data.areaIds[0] ?? null, status: "invited", inviteToken: token,
  }).returning({ id: users.id });
  if (data.areaIds.length) await db.insert(userAreas).values(data.areaIds.map((areaId) => ({ userId: u.id, areaId })));
  revalidatePath("/", "layout");
  return { ok: true, link: `/better-control/setup?token=${token}` };
}

/** PÚBLICO (sem login): a pessoa convidada define email real + senha. Token é a chave. */
export async function completeSetup(token: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Convite inválido." };
  const mail = email.trim().toLowerCase();
  if (!mail || password.length < 6) return { ok: false, error: "Email e senha (mín. 6) obrigatórios." };
  const [inv] = await db.select().from(users).where(eq(users.inviteToken, token)).limit(1);
  if (!inv || inv.status !== "invited") return { ok: false, error: "Convite inválido ou já usado." };
  const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, mail)).limit(1);
  if (clash && clash.id !== inv.id) return { ok: false, error: "Email já cadastrado." };
  const passwordHash = await hash(password, 12);
  await db.update(users).set({ email: mail, passwordHash, status: "pending", inviteToken: null, updatedAt: new Date() }).where(eq(users.id, inv.id));
  return { ok: true };
}

/** Admin aprova um usuário pendente → vira active e recebe boas-vindas. */
export async function approveUser(userId: string): Promise<{ ok: boolean; emailed: boolean }> {
  await requireAdmin();
  const [u] = await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, userId)).returning({ name: users.name, email: users.email });
  const emailed = u ? await sendWelcomeEmail(u.email, u.name) : false;
  revalidatePath("/", "layout");
  return { ok: true, emailed };
}

/** Envia boas-vindas via Resend se RESEND_API_KEY existir; senão loga (no-op). */
async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[welcome] (sem RESEND_API_KEY) seria enviado p/ ${to}`); return false; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.WELCOME_FROM || "Better Control <noreply@institutoi10.com.br>",
        to: [to], subject: "Bem-vindo(a) ao Better Control",
        html: `<p>Olá ${name},</p><p>Seu acesso ao <b>Better Control</b> foi aprovado. Acesse <a href="https://institutoi10.com.br/better-control/login">institutoi10.com.br/better-control</a> com seu email e senha.</p><p>Bom trabalho! 🚀</p>`,
      }),
    });
    return r.ok;
  } catch { return false; }
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
