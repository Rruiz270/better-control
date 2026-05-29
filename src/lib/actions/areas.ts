"use server";

import { db } from "@/db";
import { areas, projects, users, tasks, kpis } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

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
      headName: users.name,
    })
    .from(areas)
    .leftJoin(users, eq(areas.headId, users.id));

  return result;
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
  const allAreas = await getAreas();
  const stats = [];

  for (const area of allAreas) {
    const areaProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.areaId, area.id));

    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    for (const project of areaProjects) {
      const [taskStats] = await db
        .select({
          total: count(),
          completed: count(
            sql`CASE WHEN ${tasks.status} = 'concluida' THEN 1 END`
          ),
          overdue: count(
            sql`CASE WHEN ${tasks.dueDate} < CURRENT_DATE AND ${tasks.status} NOT IN ('concluida', 'cancelada') THEN 1 END`
          ),
        })
        .from(tasks)
        .where(eq(tasks.projectId, project.id));
      totalTasks += Number(taskStats.total);
      completedTasks += Number(taskStats.completed);
      overdueTasks += Number(taskStats.overdue);
    }

    const activeProjects = areaProjects.filter(
      (p) => p.status === "em_execucao"
    ).length;

    stats.push({
      ...area,
      projectCount: areaProjects.length,
      activeProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      semaphore:
        overdueTasks > 2
          ? "red"
          : overdueTasks > 0
            ? "yellow"
            : ("green" as "red" | "yellow" | "green"),
    });
  }

  return stats;
}
