import { auth } from "./auth";
import { db } from "@/db";
import { projects, tasks, kpis, automationRules, notes, users, areas, userAreas } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  AuthorizationError,
  isAdmin,
  canManageArea,
  type SessionUser,
} from "./policy";

// Re-export the pure policy so existing `@/lib/authorization` imports keep working.
export {
  AuthorizationError,
  isAdmin,
  canManageUsers,
  canViewArea,
  canManageArea,
  canContributeToArea,
  type Role,
  type SessionUser,
} from "./policy";

export async function getSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new AuthorizationError("Sessão não encontrada. Faça login.");
  return session;
}

/** Acesso ao Modo Financeiro (flag por usuário no DB). Dados sensíveis. */
export async function hasFinanceiroAccess(userId: string): Promise<boolean> {
  const [u] = await db
    .select({ fin: users.financeiroAccess })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !!u?.fin;
}

/**
 * Conjunto de pessoas cujo rateio o usuário pode preencher:
 *  - admin → todos (retorna null = "todos");
 *  - head de área → todos da(s) área(s) que lidera;
 *  - + a própria subárvore de reportes (managerId), recursivo (sub-heads);
 *  - + ele mesmo.
 */
export async function editablePeopleFor(
  user: SessionUser
): Promise<Set<string> | null> {
  if (user.role === "admin") return null; // todos

  const all = await db
    .select({ id: users.id, areaId: users.areaId, managerId: users.managerId })
    .from(users);
  const set = new Set<string>([user.id]);

  // HEAD → vê/preenche TODOS da(s) sua(s) área(s). Por PERTENCIMENTO de área
  // (user_areas + área primária), não por areas.headId — assim "Gustavo Head
  // Idiomas" enxerga todos de Idiomas mesmo sem headId setado. Inclui também
  // áreas onde ele é o head designado (areas.headId), por compatibilidade.
  if (user.role === "head") {
    const myAreas = new Set(await userAreaIds(user.id));
    const headed = await db.select({ id: areas.id }).from(areas).where(eq(areas.headId, user.id));
    for (const a of headed) myAreas.add(a.id);
    const ua = await db.select().from(userAreas);
    for (const u of all) if (u.areaId && myAreas.has(u.areaId)) set.add(u.id);
    for (const r of ua) if (myAreas.has(r.areaId)) set.add(r.userId);
  }

  // subárvore de reportes (BFS sobre managerId) — vale p/ head e sub-head
  const childrenOf = new Map<string, string[]>();
  for (const u of all) if (u.managerId) {
    const arr = childrenOf.get(u.managerId) ?? [];
    arr.push(u.id);
    childrenOf.set(u.managerId, arr);
  }
  const queue = [user.id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!set.has(child)) { set.add(child); queue.push(child); }
    }
  }
  return set;
}

export async function requireFinanceiroAccess() {
  const session = await requireSession();
  // Por enquanto, só ADMIN acessa o Financeiro. Heads/members veem a aba mas
  // são bloqueados (mensagem "Please contact admin"). hasFinanceiroAccess fica
  // disponível p/ liberar pessoas específicas no futuro sem ser admin.
  if (!isAdmin(session.user as SessionUser) && !(await hasFinanceiroAccess(session.user.id))) {
    throw new AuthorizationError("Please contact admin");
  }
  return session;
}

/** Todas as áreas da pessoa (multi-área). Fallback p/ a área primária (users.areaId). */
export async function userAreaIds(userId: string): Promise<string[]> {
  const rows = await db.select({ areaId: userAreas.areaId }).from(userAreas).where(eq(userAreas.userId, userId));
  if (rows.length) return rows.map((r) => r.areaId);
  const [u] = await db.select({ areaId: users.areaId }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.areaId ? [u.areaId] : [];
}

// --- DB-backed area resolvers ------------------------------------------------

async function areaIdForProject(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ areaId: projects.areaId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return row?.areaId ?? null;
}

async function areaIdForTask(
  taskId: string
): Promise<{ areaId: string; projectId: string } | null> {
  const [row] = await db
    .select({ areaId: projects.areaId, projectId: projects.id })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  return row ?? null;
}

async function areaIdForKpi(kpiId: string): Promise<string | null> {
  const [row] = await db
    .select({ areaId: projects.areaId })
    .from(kpis)
    .innerJoin(projects, eq(kpis.projectId, projects.id))
    .where(eq(kpis.id, kpiId))
    .limit(1);
  return row?.areaId ?? null;
}

// --- Guards (throw AuthorizationError when denied) ---------------------------

/** Leitura: precisa poder VER a área (admin, ou head/member da própria área). */
export async function requireProjectView(projectId: string) {
  const session = await requireSession();
  const areaId = await areaIdForProject(projectId);
  if (!areaId) throw new AuthorizationError("Projeto não encontrado.");
  const user = session.user as SessionUser;
  if (!isAdmin(user) && !(await userAreaIds(user.id)).includes(areaId)) throw new AuthorizationError();
  return session;
}

export async function requireTaskView(taskId: string) {
  const session = await requireSession();
  const row = await areaIdForTask(taskId);
  if (!row) throw new AuthorizationError("Tarefa não encontrada.");
  const user = session.user as SessionUser;
  if (!isAdmin(user) && !(await userAreaIds(user.id)).includes(row.areaId)) throw new AuthorizationError();
  return session;
}

/**
 * @param contributor when true, members of the area also pass (task/note work);
 *                     when false, only admins and the area head pass (structure).
 */
export async function requireAreaAccess(
  areaId: string,
  { contributor = false }: { contributor?: boolean } = {}
) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (isAdmin(user)) return session;
  const inArea = (await userAreaIds(user.id)).includes(areaId);
  // POLÍTICA ATUAL: member = SOMENTE LEITURA (vê, mas não mexe em nada). Só head
  // da área (e admin) escrevem — tanto estrutura quanto contribuições. O flag
  // `contributor` fica mantido p/ compat futura (reabrir member sem mudar callers).
  void contributor;
  const allowed = inArea && user.role === "head";
  if (!allowed) throw new AuthorizationError();
  return session;
}

export async function requireProjectAccess(
  projectId: string,
  opts: { contributor?: boolean } = {}
) {
  const areaId = await areaIdForProject(projectId);
  if (!areaId) throw new AuthorizationError("Projeto não encontrado.");
  return requireAreaAccess(areaId, opts);
}

export async function requireTaskAccess(
  taskId: string,
  opts: { contributor?: boolean } = {}
) {
  const row = await areaIdForTask(taskId);
  if (!row) throw new AuthorizationError("Tarefa não encontrada.");
  return requireAreaAccess(row.areaId, opts);
}

export async function requireKpiAccess(kpiId: string) {
  const areaId = await areaIdForKpi(kpiId);
  if (!areaId) throw new AuthorizationError("KPI não encontrado.");
  return requireAreaAccess(areaId);
}

/**
 * A note can be deleted by its author, the area head, or an admin.
 */
export async function requireNoteDeleteAccess(noteId: string) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!note) throw new AuthorizationError("Nota não encontrada.");
  if (user.role === "admin" || note.userId === user.id) return session;

  const areaId =
    note.entityType === "project"
      ? await areaIdForProject(note.entityId)
      : (await areaIdForTask(note.entityId))?.areaId ?? null;
  if (areaId && canManageArea(user, areaId)) return session;

  throw new AuthorizationError();
}

export async function requireRuleAccess(ruleId: string) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (user.role === "admin") return session;

  const [rule] = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.id, ruleId))
    .limit(1);
  if (!rule) throw new AuthorizationError("Regra não encontrada.");

  const areaId = rule.areaId ?? (rule.projectId ? await areaIdForProject(rule.projectId) : null);
  if (areaId && canManageArea(user, areaId)) return session;

  throw new AuthorizationError();
}
