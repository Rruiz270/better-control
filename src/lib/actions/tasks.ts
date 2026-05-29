"use server";

import { db } from "@/db";
import { tasks, taskAssignees, users, activityLog } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/authorization";

export async function getTasksByProject(projectId: string) {
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.position);

  const tasksWithAssignees = await Promise.all(
    projectTasks.map(async (task) => {
      const assignees = await db
        .select({
          userId: taskAssignees.userId,
          name: users.name,
          email: users.email,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, task.id));
      return { ...task, assignees };
    })
  );

  return tasksWithAssignees;
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  priority?: "critica" | "alta" | "media" | "baixa";
  dueDate?: string;
  assigneeIds?: string[];
}) {
  const session = await requireSession();
  const { assigneeIds, ...taskData } = data;

  const [task] = await db
    .insert(tasks)
    .values({
      ...taskData,
      createdBy: session.user.id,
    })
    .returning();

  if (assigneeIds?.length) {
    await db.insert(taskAssignees).values(
      assigneeIds.map((userId) => ({
        taskId: task.id,
        userId,
      }))
    );
  }

  await db.insert(activityLog).values({
    userId: session.user.id,
    entityType: "task",
    entityId: task.id,
    action: "created",
    details: { title: task.title },
  });

  revalidatePath("/", "layout");
  return task;
}

export async function updateTaskStatus(
  taskId: string,
  status: "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada" | "cancelada"
) {
  const session = await requireSession();

  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (status === "concluida") {
    updates.completedAt = new Date();
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

  await db.insert(activityLog).values({
    userId: session.user.id,
    entityType: "task",
    entityId: taskId,
    action: "status_changed",
    details: { newStatus: status },
  });

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
  await requireSession();
  await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath("/", "layout");
}

export async function deleteTask(taskId: string) {
  const session = await requireSession();

  await db.insert(activityLog).values({
    userId: session.user.id,
    entityType: "task",
    entityId: taskId,
    action: "deleted",
  });

  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath("/", "layout");
}

export async function getAllTasks() {
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
      areaName: areas.name,
      areaSlug: areas.slug,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(areas, eq(projects.areaId, areas.id))
    .orderBy(desc(tasks.createdAt));

  return allTasks;
}
