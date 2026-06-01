"use server";

import { db } from "@/db";
import { tasks, taskAssignees, users, activityLog, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { evaluateRules } from "./automations";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireProjectView,
  requireProjectAccess,
  requireTaskAccess,
  type SessionUser,
} from "@/lib/authorization";

type Assignee = { userId: string; name: string; email: string };
type TaskWithAssignees = typeof tasks.$inferSelect & { assignees: Assignee[] };

export async function getTasksByProject(projectId: string) {
  await requireProjectView(projectId);
  // Single query (task LEFT JOIN assignees LEFT JOIN users) grouped in memory,
  // instead of one round-trip per task. neon-http bills every query as its own
  // HTTP request, so the previous N+1 was literally N+1 network calls.
  const rows = await db
    .select({
      task: tasks,
      assigneeId: taskAssignees.userId,
      assigneeName: users.name,
      assigneeEmail: users.email,
    })
    .from(tasks)
    .leftJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
    .leftJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.position);

  const byTask = new Map<string, TaskWithAssignees>();
  for (const row of rows) {
    let entry = byTask.get(row.task.id);
    if (!entry) {
      entry = { ...row.task, assignees: [] };
      byTask.set(row.task.id, entry);
    }
    if (row.assigneeId && row.assigneeName && row.assigneeEmail) {
      entry.assignees.push({
        userId: row.assigneeId,
        name: row.assigneeName,
        email: row.assigneeEmail,
      });
    }
  }

  return Array.from(byTask.values());
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  priority?: "critica" | "alta" | "media" | "baixa";
  dueDate?: string;
  assigneeIds?: string[];
}) {
  const session = await requireProjectAccess(data.projectId, { contributor: true });
  const { assigneeIds, ...taskData } = data;

  // Pre-generate the id so task, assignees and activity log go out in a single
  // db.batch() (one HTTP request, executed as one transaction). neon-http has
  // no interactive transactions, so batch() is how we get atomicity here.
  const taskId = crypto.randomUUID();

  const insertTask = db.insert(tasks).values({
    ...taskData,
    id: taskId,
    createdBy: session.user.id,
  });
  const insertLog = db.insert(activityLog).values({
    userId: session.user.id,
    entityType: "task",
    entityId: taskId,
    action: "created",
    details: { title: taskData.title },
  });

  if (assigneeIds?.length) {
    const insertAssignees = db
      .insert(taskAssignees)
      .values(assigneeIds.map((userId) => ({ taskId, userId })));
    await db.batch([insertTask, insertAssignees, insertLog]);
  } else {
    await db.batch([insertTask, insertLog]);
  }

  revalidatePath("/", "layout");
  // Return the full row (with DB defaults like status/position/timestamps) so
  // callers can optimistically append it to their list.
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return task;
}

export async function updateTaskStatus(
  taskId: string,
  status: "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada" | "cancelada"
) {
  const session = await requireTaskAccess(taskId, { contributor: true });

  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (status === "concluida") {
    updates.completedAt = new Date();
  }

  const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const oldStatus = existingTask?.status;

  await db.batch([
    db.update(tasks).set(updates).where(eq(tasks.id, taskId)),
    db.insert(activityLog).values({
      userId: session.user.id,
      entityType: "task",
      entityId: taskId,
      action: "status_changed",
      details: { oldStatus, newStatus: status },
    }),
  ]);

  if (existingTask) {
    const [project] = await db.select().from(projects).where(eq(projects.id, existingTask.projectId)).limit(1);
    evaluateRules("task_status_changed", {
      taskId,
      projectId: existingTask.projectId,
      areaId: project?.areaId,
      userId: session.user.id,
      oldStatus,
      newStatus: status,
    }).catch(() => {});
  }

  revalidatePath("/", "layout");
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: "critica" | "alta" | "media" | "baixa";
    dueDate?: string | null;
  }
) {
  await requireTaskAccess(taskId, { contributor: true });
  await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  const session = await requireTaskAccess(taskId);

  await db.batch([
    db.insert(activityLog).values({
      userId: session.user.id,
      entityType: "task",
      entityId: taskId,
      action: "deleted",
    }),
    db.delete(tasks).where(eq(tasks.id, taskId)),
  ]);
  revalidatePath("/", "layout");
}

export async function getAllTasks() {
  const session = await requireSession();
  const user = session.user as SessionUser;
  const { projects, areas } = await import("@/db/schema");

  const allTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      projectId: tasks.projectId,
      projectName: projects.name,
      projectSlug: projects.slug,
      areaId: areas.id,
      areaName: areas.name,
      areaSlug: areas.slug,
      areaColor: areas.color,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(areas, eq(projects.areaId, areas.id))
    .orderBy(desc(tasks.createdAt));

  // Escopo por permissão: admin vê tudo; head/member só a própria área.
  if (user.role === "admin") return allTasks;
  return allTasks.filter((t) => t.areaId === user.areaId);
}
