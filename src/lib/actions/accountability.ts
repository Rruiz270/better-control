"use server";

import { db } from "@/db";
import { tasks, taskAssignees, users, projects, areas } from "@/db/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";

export type PersonStats = {
  userId: string;
  name: string;
  email: string;
  areaName: string | null;
  totalAssigned: number;
  completed: number;
  onTime: number;
  overdue: number;
  inProgress: number;
  complianceRate: number;
  completionRate: number;
};

export async function getAccountabilityStats(): Promise<PersonStats[]> {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      areaId: users.areaId,
      areaName: areas.name,
    })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id));

  const stats: PersonStats[] = [];

  for (const user of allUsers) {
    const assignedTaskIds = await db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, user.id));

    if (assignedTaskIds.length === 0) {
      const createdTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.createdBy, user.id));

      if (createdTasks.length === 0) continue;

      const completed = createdTasks.filter((t) => t.status === "concluida");
      const onTime = completed.filter((t) => {
        if (!t.dueDate || !t.completedAt) return true;
        return new Date(t.completedAt) <= new Date(t.dueDate + "T23:59:59");
      });
      const overdue = createdTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== "concluida" &&
          t.status !== "cancelada"
      );
      const inProgress = createdTasks.filter((t) => t.status === "em_andamento");

      stats.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        areaName: user.areaName,
        totalAssigned: createdTasks.length,
        completed: completed.length,
        onTime: onTime.length,
        overdue: overdue.length,
        inProgress: inProgress.length,
        complianceRate:
          completed.length > 0
            ? Math.round((onTime.length / completed.length) * 100)
            : 100,
        completionRate:
          createdTasks.length > 0
            ? Math.round((completed.length / createdTasks.length) * 100)
            : 0,
      });
      continue;
    }

    const taskIds = assignedTaskIds.map((t) => t.taskId);
    const userTasks = [];
    for (const tid of taskIds) {
      const [t] = await db.select().from(tasks).where(eq(tasks.id, tid)).limit(1);
      if (t) userTasks.push(t);
    }

    const completed = userTasks.filter((t) => t.status === "concluida");
    const onTime = completed.filter((t) => {
      if (!t.dueDate || !t.completedAt) return true;
      return new Date(t.completedAt) <= new Date(t.dueDate + "T23:59:59");
    });
    const overdue = userTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== "concluida" &&
        t.status !== "cancelada"
    );
    const inProgress = userTasks.filter((t) => t.status === "em_andamento");

    stats.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      areaName: user.areaName,
      totalAssigned: userTasks.length,
      completed: completed.length,
      onTime: onTime.length,
      overdue: overdue.length,
      inProgress: inProgress.length,
      complianceRate:
        completed.length > 0
          ? Math.round((onTime.length / completed.length) * 100)
          : 100,
      completionRate:
        userTasks.length > 0
          ? Math.round((completed.length / userTasks.length) * 100)
          : 0,
    });
  }

  return stats.sort((a, b) => b.totalAssigned - a.totalAssigned);
}

export async function getProjectRollups() {
  const allAreas = await db.select().from(areas);
  const rollups = [];

  for (const area of allAreas) {
    const areaProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.areaId, area.id));

    let areaTotalTasks = 0;
    let areaCompletedTasks = 0;
    let areaOverdueTasks = 0;
    let areaOnTimeTasks = 0;
    let areaBudget = 0;
    let areaForecast = 0;

    const projectRollups = [];

    for (const project of areaProjects) {
      const projectTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, project.id));

      const total = projectTasks.length;
      const completed = projectTasks.filter((t) => t.status === "concluida").length;
      const overdue = projectTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== "concluida" &&
          t.status !== "cancelada"
      ).length;
      const onTime = projectTasks
        .filter((t) => t.status === "concluida")
        .filter((t) => {
          if (!t.dueDate || !t.completedAt) return true;
          return new Date(t.completedAt) <= new Date(t.dueDate + "T23:59:59");
        }).length;

      areaTotalTasks += total;
      areaCompletedTasks += completed;
      areaOverdueTasks += overdue;
      areaOnTimeTasks += onTime;
      areaBudget += project.budget ? Number(project.budget) : 0;
      areaForecast += project.forecast ? Number(project.forecast) : 0;

      projectRollups.push({
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        totalTasks: total,
        completedTasks: completed,
        overdueTasks: overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        complianceRate: completed > 0 ? Math.round((onTime / completed) * 100) : 100,
        budget: project.budget ? Number(project.budget) : 0,
        forecast: project.forecast ? Number(project.forecast) : 0,
      });
    }

    rollups.push({
      areaId: area.id,
      areaName: area.name,
      areaSlug: area.slug,
      areaColor: area.color,
      totalProjects: areaProjects.length,
      totalTasks: areaTotalTasks,
      completedTasks: areaCompletedTasks,
      overdueTasks: areaOverdueTasks,
      completionRate:
        areaTotalTasks > 0
          ? Math.round((areaCompletedTasks / areaTotalTasks) * 100)
          : 0,
      complianceRate:
        areaCompletedTasks > 0
          ? Math.round((areaOnTimeTasks / areaCompletedTasks) * 100)
          : 100,
      budget: areaBudget,
      forecast: areaForecast,
      projects: projectRollups,
    });
  }

  return rollups;
}
