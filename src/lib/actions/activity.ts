"use server";

import { db } from "@/db";
import { activityLog, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireSession, isAdmin, AuthorizationError, type SessionUser } from "@/lib/authorization";

const SELECT = {
  id: activityLog.id,
  entityType: activityLog.entityType,
  entityId: activityLog.entityId,
  action: activityLog.action,
  details: activityLog.details,
  createdAt: activityLog.createdAt,
  userId: activityLog.userId,
  userName: users.name,
};

export async function getRecentActivity(limit = 20) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  // Escopo: head/member veem só atividade de quem é da própria área; admin vê tudo.
  // Membro sem área não vê nada (evita where com areaId null).
  const where =
    user.role === "admin"
      ? undefined
      : user.areaId
        ? eq(users.areaId, user.areaId)
        : sql`false`;

  return db
    .select(SELECT)
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

/** Auditoria completa — só admin. Mostra tudo e quem fez. */
export async function getAuditLog(limit = 300) {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) {
    throw new AuthorizationError("Apenas admins acessam os logs.");
  }
  return db
    .select(SELECT)
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
