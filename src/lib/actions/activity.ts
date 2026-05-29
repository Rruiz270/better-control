"use server";

import { db } from "@/db";
import { activityLog, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getRecentActivity(limit = 20) {
  return db
    .select({
      id: activityLog.id,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      userId: activityLog.userId,
      userName: users.name,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
