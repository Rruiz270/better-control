"use server";

import { db } from "@/db";
import { areas, projects, users, tasks, kpis } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession, isAdmin, userAreaIds, AuthorizationError, type SessionUser } from "@/lib/authorization";

export async function getAreas() {
  const result = await db
    .select({
      id: areas.id,
      name: areas.name,
      slug: areas.slug,
      description: areas.description,
      color: areas.color,
      icon: areas.icon,
      headId: areas.headId,
      profile: areas.profile,
      targetMultiplier: areas.targetMultiplier,
      headName: users.name,
    })
    .from(areas)
    .leftJoin(users, eq(areas.headId, users.id));

  return result;
}

/** Admin define o perfil (receita/suporte) e o multiplicador alvo (regra 30x) da área. */
export async function updateAreaConfig(
  areaId: string,
  data: { profile: "receita" | "suporte"; targetMultiplier: number }
) {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) {
    throw new AuthorizationError("Apenas admins configuram áreas.");
  }
  await db
    .update(areas)
    .set({
      profile: data.profile,
      targetMultiplier: String(data.targetMultiplier),
      updatedAt: new Date(),
    })
    .where(eq(areas.id, areaId));
  revalidatePath("/", "layout");
}

export async function getAreaBySlug(slug: string) {
  const [area] = await db
    .select()
    .from(areas)
    .where(eq(areas.slug, slug))
    .limit(1);
  return area;
}

export async function getAreaWithStats(slug: string) {
  const area = await getAreaBySlug(slug);
  if (!area) return null;

  const areaProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.areaId, area.id));

  const projectIds = areaProjects.map((p) => p.id);

  let totalTasks = 0;
  let completedTasks = 0;

  if (projectIds.length > 0) {
    for (const pid of projectIds) {
      const [taskStats] = await db
        .select({
          total: count(),
          completed: count(
            sql`CASE WHEN ${tasks.status} = 'concluida' THEN 1 END`
          ),
        })
        .from(tasks)
        .where(eq(tasks.projectId, pid));
      totalTasks += Number(taskStats.total);
      completedTasks += Number(taskStats.completed);
    }
  }

  const head = area.headId
    ? (
        await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, area.headId))
          .limit(1)
      )[0]
    : null;

  return {
    ...area,
    headName: head?.name ?? null,
    projects: areaProjects,
    totalTasks,
    completedTasks,
  };
}

export async function getDashboardStats() {
  const session = await requireSession();
  const user = session.user as SessionUser;
  const allAreas = await getAreas();
  // Escopo: head/member veem TODAS as suas áreas (multi-área); admin vê todas.
  const visibleAreas = user.role === "admin"
    ? allAreas
    : await (async () => {
        const ids = new Set(await userAreaIds(user.id));
        return allAreas.filter((a) => ids.has(a.id));
      })();

  // Duas queries agregadas (GROUP BY) em vez de N+1 por projeto.
  const projAgg = await db
    .select({
      areaId: projects.areaId,
      total: count(),
      active: count(sql`CASE WHEN ${projects.status} = 'em_execucao' THEN 1 END`),
    })
    .from(projects)
    .groupBy(projects.areaId);

  const taskAgg = await db
    .select({
      areaId: projects.areaId,
      total: count(),
      completed: count(sql`CASE WHEN ${tasks.status} = 'concluida' THEN 1 END`),
      overdue: count(
        sql`CASE WHEN ${tasks.dueDate} < CURRENT_DATE AND ${tasks.status} NOT IN ('concluida', 'cancelada') THEN 1 END`
      ),
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .groupBy(projects.areaId);

  const projById = new Map(projAgg.map((p) => [p.areaId, p]));
  const taskById = new Map(taskAgg.map((t) => [t.areaId, t]));

  return visibleAreas.map((area) => {
    const p = projById.get(area.id);
    const t = taskById.get(area.id);
    const overdueTasks = Number(t?.overdue ?? 0);
    return {
      ...area,
      projectCount: Number(p?.total ?? 0),
      activeProjects: Number(p?.active ?? 0),
      totalTasks: Number(t?.total ?? 0),
      completedTasks: Number(t?.completed ?? 0),
      overdueTasks,
      semaphore:
        overdueTasks > 2
          ? "red"
          : overdueTasks > 0
            ? "yellow"
            : ("green" as "red" | "yellow" | "green"),
    };
  });
}
