"use server";

import { db } from "@/db";
import {
  users,
  areas,
  userAreas,
  tasks,
  taskAssignees,
  projects,
  projectMembers,
  notes,
  activityLog,
  automationRules,
  pushSubscriptions,
  financialPlans,
  collaboratorCost,
  allocations,
  timeEntries,
  initiatives,
} from "@/db/schema";
import { eq, sql, ne } from "drizzle-orm";
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
    .where(ne(users.status, "placeholder")) // esconde o usuário-fantasma de sistema
    .orderBy(users.name);
  // multi-área: anexa todas as áreas de cada usuário (fallback p/ a primária)
  const ua = await db.select().from(userAreas);
  const byUser = new Map<string, string[]>();
  for (const r of ua) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.areaId]);
  return rows.map((u) => ({ ...u, areaIds: byUser.get(u.id) ?? (u.areaId ? [u.areaId] : []) }));
}

/** Define as áreas (multi) de um usuário; primária = primeira da lista.
 * Se o usuário for HEAD, marca-o como head designado (areas.headId) das suas
 * áreas — assim o painel deixa de mostrar "Sem head definido". */
export async function setUserAreas(userId: string, areaIds: string[]): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(userAreas).where(eq(userAreas.userId, userId));
  if (areaIds.length) await db.insert(userAreas).values(areaIds.map((areaId) => ({ userId, areaId })));
  await db.update(users).set({ areaId: areaIds[0] ?? null, updatedAt: new Date() }).where(eq(users.id, userId));

  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.role === "head" && areaIds.length) {
    for (const areaId of areaIds) {
      await db.update(areas).set({ headId: userId }).where(eq(areas.id, areaId));
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Define/remove explicitamente o head designado de uma área (areas.headId). */
export async function setAreaHead(areaId: string, userId: string | null): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.update(areas).set({ headId: userId }).where(eq(areas.id, areaId));
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

// --- Onboarding: auto-cadastro (público) → aprovação do admin → boas-vindas ----

/** PÚBLICO (na tela de login): a pessoa se cadastra. Fica "pending" até um admin
 * aprovar. Não pode se autodeclarar admin. */
export async function registerUser(data: {
  name: string; email: string; phone?: string; password: string;
  role: "head" | "member"; areaId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const mail = data.email.trim().toLowerCase();
  if (!data.name.trim() || !mail || data.password.length < 6) {
    return { ok: false, error: "Nome, email e senha (mín. 6) são obrigatórios." };
  }
  const role: Role = data.role === "head" ? "head" : "member"; // nunca admin via cadastro
  const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, mail)).limit(1);
  if (clash) return { ok: false, error: "Já existe um cadastro com este email." };
  const passwordHash = await hash(data.password, 12);
  const [u] = await db.insert(users).values({
    name: data.name.trim(), email: mail, phone: data.phone?.trim() || null, passwordHash,
    role, areaId: data.areaId ?? null, status: "pending",
  }).returning({ id: users.id });
  if (data.areaId) await db.insert(userAreas).values({ userId: u.id, areaId: data.areaId });
  return { ok: true };
}

/** Áreas (id+nome) p/ o dropdown público de cadastro. */
export async function listAreasPublic() {
  return db.select({ id: areas.id, name: areas.name }).from(areas).orderBy(areas.name);
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

// --- Exclusão de usuário + transferência de dados ---------------------------

/** Email-sentinela do usuário "Não atribuído". É um estacionamento de dados:
 * recebe atividades/alocações de quem foi excluído até um admin redistribuir.
 * Nunca loga (status != "active") nem aparece na lista editável da tela. */
const PLACEHOLDER_EMAIL = "placeholder@better-control.local";

/** Garante (cria se faltar) o usuário-placeholder e devolve seu id. Senha
 * impossível (UUID duplo hasheado) + status "placeholder" → login bloqueado. */
async function getOrCreatePlaceholderUser(): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, PLACEHOLDER_EMAIL))
    .limit(1);
  if (existing) return existing.id;
  const passwordHash = await hash(crypto.randomUUID() + crypto.randomUUID(), 12);
  const [u] = await db
    .insert(users)
    .values({
      name: "Não atribuído",
      email: PLACEHOLDER_EMAIL,
      passwordHash,
      role: "member",
      status: "placeholder",
    })
    .returning({ id: users.id });
  return u.id;
}

/**
 * Exclui um usuário resolvendo todas as FKs num único `db.batch` (atômico).
 *
 * `transferToId`:
 *  · `"__placeholder__"` → estaciona os dados no usuário "Não atribuído".
 *  · `<uuid>`            → transfere para o usuário escolhido.
 *  · `null`             → sem transferência: tarefas/projetos criados pelo
 *                          excluído passam para o admin atual; dados pessoais
 *                          (horas/custo/alocação/notas) são apagados.
 *
 * Em QUALQUER modo, salário (`collaborator_cost`) NÃO é transferido — é apagado,
 * pois é o custo individual da pessoa, não uma "atividade" reatribuível.
 */
export async function deleteUser(
  userId: string,
  opts: { transferToId: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const adminId = session.user.id;

  if (userId === adminId) {
    return { ok: false, error: "Você não pode excluir a si mesmo." };
  }

  const [victim] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!victim) return { ok: false, error: "Usuário não encontrado." };

  // Nunca deixe o sistema sem admin.
  if (victim.role === "admin") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "admin"));
    if (n <= 1) return { ok: false, error: "Não dá para excluir o único admin." };
  }

  // Resolve o destino da transferência (cria placeholder sob demanda).
  let targetId: string | null = null;
  if (opts.transferToId === "__placeholder__") {
    targetId = await getOrCreatePlaceholderUser();
  } else if (opts.transferToId) {
    const [t] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, opts.transferToId))
      .limit(1);
    if (!t) return { ok: false, error: "Destinatário da transferência não existe." };
    targetId = t.id;
  }
  if (targetId === userId) {
    return { ok: false, error: "O destinatário não pode ser o próprio usuário excluído." };
  }

  if (targetId) {
    // --- MODO TRANSFERÊNCIA: move propriedade/atividades/tempo para `targetId`.
    const T = targetId;
    await db.batch([
      // Join-tables com PK composta: dropa a linha do excluído onde o destino já
      // existe naquele escopo (senão violaria a PK), depois reatribui o resto.
      db.delete(taskAssignees).where(
        sql`${taskAssignees.userId} = ${userId} and exists (select 1 from ${taskAssignees} ta2 where ta2.task_id = ${taskAssignees.taskId} and ta2.user_id = ${T})`
      ),
      db.update(taskAssignees).set({ userId: T }).where(eq(taskAssignees.userId, userId)),
      db.delete(projectMembers).where(
        sql`${projectMembers.userId} = ${userId} and exists (select 1 from ${projectMembers} pm2 where pm2.project_id = ${projectMembers.projectId} and pm2.user_id = ${T})`
      ),
      db.update(projectMembers).set({ userId: T }).where(eq(projectMembers.userId, userId)),
      db.delete(allocations).where(
        sql`${allocations.userId} = ${userId} and exists (select 1 from ${allocations} al2 where al2.project_id = ${allocations.projectId} and al2.year = ${allocations.year} and al2.month = ${allocations.month} and al2.user_id = ${T})`
      ),
      db.update(allocations).set({ userId: T }).where(eq(allocations.userId, userId)),
      // Tempo real lançado (append-only, sem unique) → move direto.
      db.update(timeEntries).set({ userId: T }).where(eq(timeEntries.userId, userId)),
      // Propriedade / autoria.
      db.update(tasks).set({ createdBy: T }).where(eq(tasks.createdBy, userId)),
      db.update(projects).set({ createdBy: T }).where(eq(projects.createdBy, userId)),
      db.update(notes).set({ userId: T }).where(eq(notes.userId, userId)),
      db.update(areas).set({ headId: T }).where(eq(areas.headId, userId)),
      db.update(initiatives).set({ ownerId: T }).where(eq(initiatives.ownerId, userId)),
      db.update(initiatives).set({ createdBy: T }).where(eq(initiatives.createdBy, userId)),
      db.update(users).set({ managerId: T }).where(eq(users.managerId, userId)),
      // Auditoria → anula (não falsifica "quem fez" reapontando p/ outra pessoa).
      db.update(automationRules).set({ createdBy: null }).where(eq(automationRules.createdBy, userId)),
      db.update(financialPlans).set({ updatedBy: null }).where(eq(financialPlans.updatedBy, userId)),
      db.update(allocations).set({ updatedBy: null }).where(eq(allocations.updatedBy, userId)),
      db.update(collaboratorCost).set({ updatedBy: null }).where(eq(collaboratorCost.updatedBy, userId)),
      // Salário NÃO transfere · histórico/inscrições push/áreas são pessoais → apaga.
      db.delete(collaboratorCost).where(eq(collaboratorCost.userId, userId)),
      db.delete(activityLog).where(eq(activityLog.userId, userId)),
      db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
      db.delete(userAreas).where(eq(userAreas.userId, userId)),
      db.delete(users).where(eq(users.id, userId)),
    ]);
  } else {
    // --- MODO SEM TRANSFERÊNCIA: criadores → admin; pessoal apagado.
    await db.batch([
      db.update(tasks).set({ createdBy: adminId }).where(eq(tasks.createdBy, userId)),
      db.update(projects).set({ createdBy: adminId }).where(eq(projects.createdBy, userId)),
      db.update(areas).set({ headId: null }).where(eq(areas.headId, userId)),
      db.update(users).set({ managerId: null }).where(eq(users.managerId, userId)),
      db.update(automationRules).set({ createdBy: null }).where(eq(automationRules.createdBy, userId)),
      db.update(financialPlans).set({ updatedBy: null }).where(eq(financialPlans.updatedBy, userId)),
      db.update(initiatives).set({ ownerId: null }).where(eq(initiatives.ownerId, userId)),
      db.update(initiatives).set({ createdBy: null }).where(eq(initiatives.createdBy, userId)),
      db.update(allocations).set({ updatedBy: null }).where(eq(allocations.updatedBy, userId)),
      db.update(collaboratorCost).set({ updatedBy: null }).where(eq(collaboratorCost.updatedBy, userId)),
      db.delete(taskAssignees).where(eq(taskAssignees.userId, userId)),
      db.delete(projectMembers).where(eq(projectMembers.userId, userId)),
      db.delete(allocations).where(eq(allocations.userId, userId)),
      db.delete(collaboratorCost).where(eq(collaboratorCost.userId, userId)),
      db.delete(timeEntries).where(eq(timeEntries.userId, userId)),
      db.delete(userAreas).where(eq(userAreas.userId, userId)),
      db.delete(notes).where(eq(notes.userId, userId)),
      db.delete(activityLog).where(eq(activityLog.userId, userId)),
      db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
      db.delete(users).where(eq(users.id, userId)),
    ]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Usuário troca a própria senha (1º login com senha temporária). */
export async function changeMyPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (newPassword.length < 6) return { ok: false, error: "Mínimo 6 caracteres." };
  const passwordHash = await hash(newPassword, 12);
  await db.update(users).set({ passwordHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, session.user.id));
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
