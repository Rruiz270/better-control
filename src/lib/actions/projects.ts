"use server";

import { db } from "@/db";
import { projects, tasks, kpis, projectMembers, users, activityLog } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAreaAccess, requireProjectAccess } from "@/lib/authorization";

export async function getProjectsByArea(areaId: string) {
  return db.select().from(projects).where(eq(projects.areaId, areaId));
}

export async function getProjectBySlug(areaSlug: string, projectSlug: string) {
  const { areas } = await import("@/db/schema");
  const [area] = await db
    .select()
    .from(areas)
    .where(eq(areas.slug, areaSlug))
    .limit(1);
  if (!area) return null;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.areaId, area.id), eq(projects.slug, projectSlug)))
    .limit(1);

  return project ? { ...project, area } : null;
}

export async function getProjectWithDetails(
  areaSlug: string,
  projectSlug: string
) {
  const project = await getProjectBySlug(areaSlug, projectSlug);
  if (!project) return null;

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id));

  const projectKpis = await db
    .select()
    .from(kpis)
    .where(eq(kpis.projectId, project.id));

  const members = await db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, project.id));

  return {
    ...project,
    tasks: projectTasks,
    kpis: projectKpis,
    members,
  };
}

export async function updateProjectStatus(
  projectId: string,
  status: string
) {
  const session = await requireProjectAccess(projectId);

  const [existing] = await db
    .select({ status: projects.status, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  await db.batch([
    db
      .update(projects)
      .set({
        status: status as "planejamento" | "em_execucao" | "pausado" | "concluido" | "descontinuado",
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId)),
    db.insert(activityLog).values({
      userId: session.user.id,
      entityType: "project",
      entityId: projectId,
      action: "status_changed",
      details: { name: existing?.name, oldStatus: existing?.status, newStatus: status },
    }),
  ]);

  revalidatePath("/", "layout");
}

export async function createProject(data: {
  areaId: string;
  name: string;
  slug: string;
  description?: string;
  budget?: string;
  startDate?: string;
  targetDate?: string;
}) {
  const session = await requireAreaAccess(data.areaId);
  const [project] = await db
    .insert(projects)
    .values({
      ...data,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/", "layout");
  return project;
}
