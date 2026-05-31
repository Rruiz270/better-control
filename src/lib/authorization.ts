import { auth } from "./auth";
import { db } from "@/db";
import { projects, tasks, kpis, automationRules, notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  AuthorizationError,
  canContributeToArea,
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
  const allowed = contributor
    ? canContributeToArea(user, areaId)
    : canManageArea(user, areaId);
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
