"use server";

import { db } from "@/db";
import { activityLog, authLog, financialLineLog, projects, areas, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireSession, isAdmin, userAreaIds, AuthorizationError, type SessionUser } from "@/lib/authorization";
import { inArray } from "drizzle-orm";
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/constants";
import { LINE_LABEL, type FinLine } from "@/lib/financialLines.constants";

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
  // Escopo: head/member veem atividade de quem é das suas áreas (multi-área); admin vê tudo.
  // Sem área nenhuma → não vê nada (evita where com areaId null).
  let where;
  if (user.role === "admin") {
    where = undefined;
  } else {
    const areaIds = await userAreaIds(user.id);
    where = areaIds.length ? inArray(users.areaId, areaIds) : sql`false`;
  }

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

// ───────────────────────── Feed unificado (admin) ──────────────────────────
// Junta DUAS fontes num feed só, já formatado p/ exibição:
//  · activity_log      → projeto/tarefa/automação (criou/atualizou/status…)
//  · financial_line_log→ edição de linha financeira (campo, de→para, nota)
export type AuditKind = "financeiro" | "projeto" | "tarefa" | "automacao" | "login" | "outro";
export type AuditFeedEntry = {
  id: string;
  kind: AuditKind;
  when: string;        // ISO — formatado no client
  who: string;
  action: string;      // o que fez (label legível)
  item: string;        // sobre o quê (nome do projeto/área/automação)
  from: string | null; // valor/estado anterior
  to: string | null;   // valor/estado novo
  note: string | null;
};

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const brl = (v: string | number | null) => `R$ ${Math.round(Number(v ?? 0)).toLocaleString("pt-BR")}`;
const ACTION_PT: Record<string, string> = {
  created: "criou", updated: "atualizou", deleted: "excluiu",
  status_changed: "mudou status", completed: "concluiu", triggered: "disparou",
  sent: "enviou", queued: "enfileirou", project_approved: "aprovou projeto",
  project_rejected: "recusou projeto",
};
const KIND_OF: Record<string, AuditKind> = {
  project: "projeto", task: "tarefa", automation: "automacao",
  notification: "automacao", whatsapp: "automacao",
};

/** Feed de auditoria unificado e já formatado — só admin. */
export async function getAuditFeed(limit = 400): Promise<AuditFeedEntry[]> {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) {
    throw new AuthorizationError("Apenas admins acessam os logs.");
  }

  // 1) atividade de projeto/tarefa/automação
  const acts = await db
    .select(SELECT)
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  const fromActs: AuditFeedEntry[] = acts.map((e) => {
    const d = (e.details ?? {}) as Record<string, unknown>;
    const name = (d.name || d.title) as string | undefined;
    const labels = e.entityType === "project" ? PROJECT_STATUS_LABELS : TASK_STATUS_LABELS;
    return {
      id: `a:${e.id}`,
      kind: KIND_OF[e.entityType] ?? "outro",
      when: new Date(e.createdAt).toISOString(),
      who: e.userName,
      action: ACTION_PT[e.action] ?? e.action,
      item: name ?? e.entityType,
      from: e.action === "status_changed" ? labels[d.oldStatus as string] ?? (d.oldStatus as string) ?? null : null,
      to: e.action === "status_changed" ? labels[d.newStatus as string] ?? (d.newStatus as string) ?? null : null,
      note: null,
    };
  });

  // 2) edições de linha financeira (de→para por campo) + nome da entidade
  const fins = await db
    .select({
      id: financialLineLog.id,
      line: financialLineLog.line,
      month: financialLineLog.month,
      year: financialLineLog.year,
      oldValue: financialLineLog.oldValue,
      newValue: financialLineLog.newValue,
      note: financialLineLog.note,
      changedAt: financialLineLog.changedAt,
      who: users.name,
      projName: projects.name,
      areaName: areas.name,
    })
    .from(financialLineLog)
    .leftJoin(users, eq(financialLineLog.changedBy, users.id))
    .leftJoin(projects, eq(financialLineLog.entityId, projects.id))
    .leftJoin(areas, eq(financialLineLog.entityId, areas.id))
    .orderBy(desc(financialLineLog.changedAt))
    .limit(limit);

  const fromFins: AuditFeedEntry[] = fins.map((f) => ({
    id: `f:${f.id}`,
    kind: "financeiro",
    when: new Date(f.changedAt).toISOString(),
    who: f.who ?? "—",
    action: `${LINE_LABEL[f.line as FinLine]} · ${MONTH_ABBR[f.month - 1]}/${f.year}`,
    item: f.projName ?? f.areaName ?? "—",
    from: brl(f.oldValue),
    to: brl(f.newValue),
    note: f.note,
  }));

  // 3) logins (toda tentativa, sucesso/falha)
  const auths = await db
    .select({
      id: authLog.id,
      email: authLog.email,
      success: authLog.success,
      reason: authLog.reason,
      ip: authLog.ip,
      createdAt: authLog.createdAt,
      who: users.name,
    })
    .from(authLog)
    .leftJoin(users, eq(authLog.userId, users.id))
    .orderBy(desc(authLog.createdAt))
    .limit(limit);

  const fromAuths: AuditFeedEntry[] = auths.map((a) => ({
    id: `l:${a.id}`,
    kind: "login",
    when: new Date(a.createdAt).toISOString(),
    who: a.who ?? a.email,
    action: a.success ? "entrou no sistema" : "tentativa de login falhou",
    item: a.email,
    from: null,
    to: null,
    note: a.ip ? `IP ${a.ip}${!a.success && a.reason ? ` · ${a.reason}` : ""}` : (!a.success ? a.reason : null),
  }));

  // 4) merge + ordena por data desc + corta no limite
  return [...fromActs, ...fromFins, ...fromAuths]
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, limit);
}
