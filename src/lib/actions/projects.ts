"use server";

import { db } from "@/db";
import { projects, tasks, kpis, projectMembers, users, activityLog } from "@/db/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAreaAccess, requireProjectAccess, requireSession, isAdmin, AuthorizationError, type SessionUser } from "@/lib/authorization";

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
  viabilityReason?: string;
  expectedRevenue?: string;
  expectedCost?: string;
}) {
  // Head pode propor projeto em QUALQUER vertical → fica pendente p/ admin aprovar.
  // Admin cria já aprovado. Member não cria.
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (!isAdmin(user) && user.role !== "head") {
    throw new AuthorizationError("Apenas head (propõe) ou admin (cria) podem criar projetos.");
  }
  const admin = isAdmin(user);
  const [project] = await db
    .insert(projects)
    .values({
      areaId: data.areaId, name: data.name, slug: data.slug, description: data.description,
      budget: data.budget, startDate: data.startDate, targetDate: data.targetDate,
      viabilityReason: data.viabilityReason, expectedRevenue: data.expectedRevenue, expectedCost: data.expectedCost,
      createdBy: user.id, requestedBy: user.id,
      approval: admin ? "approved" : "pending",
      approvedBy: admin ? user.id : null, approvedAt: admin ? new Date() : null,
    })
    .returning();

  revalidatePath("/", "layout");
  return project;
}

/** Projetos pendentes de aprovação (admin). Alimenta o lembrete no login. */
export async function getPendingProjects() {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) return [];
  const { areas } = await import("@/db/schema");
  return db
    .select({
      id: projects.id, name: projects.name, areaId: projects.areaId, areaName: areas.name, areaSlug: areas.slug, slug: projects.slug,
      reason: projects.viabilityReason, revenue: projects.expectedRevenue, cost: projects.expectedCost,
      requester: users.name, createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(areas, eq(projects.areaId, areas.id))
    .leftJoin(users, eq(projects.requestedBy, users.id))
    .where(eq(projects.approval, "pending"))
    .orderBy(desc(projects.createdAt));
}

/** Admin aprova ou recusa um projeto. */
export async function decideProject(projectId: string, decision: "approved" | "rejected") {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (!isAdmin(user)) throw new AuthorizationError("Apenas admin aprova projetos.");
  await db.update(projects).set({ approval: decision, approvedBy: user.id, approvedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, projectId));
  await db.insert(activityLog).values({ userId: user.id, entityType: "project", entityId: projectId, action: decision === "approved" ? "project_approved" : "project_rejected", details: {} });
  revalidatePath("/", "layout");
  return { ok: true };
}
