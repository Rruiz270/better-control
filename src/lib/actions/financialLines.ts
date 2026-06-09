"use server";

import { db } from "@/db";
import { financialLines, financialLineLog, projects } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireAreaAccess,
  requireProjectAccess,
  AuthorizationError,
  isAdmin,
  userAreaIds,
  type SessionUser,
} from "@/lib/authorization";
import { ALL_LINES, type FinEntity, type FinLine } from "@/lib/financialLines.constants";

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => `m${i + 1}` as const);
const zeros = () => Array(12).fill(0) as number[];

async function areaIdForProject(projectId: string): Promise<string | null> {
  const [row] = await db.select({ areaId: projects.areaId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  return row?.areaId ?? null;
}

async function assertCanView(entityType: FinEntity, entityId: string) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (isAdmin(user)) return session;
  const areaId = entityType === "area" ? entityId : await areaIdForProject(entityId);
  if (!areaId || !(await userAreaIds(user.id)).includes(areaId)) throw new AuthorizationError();
  return session;
}

/** Editar é ação de gestão: admin ou HEAD da área (member = leitura). */
async function assertCanEdit(entityType: FinEntity, entityId: string) {
  return entityType === "area" ? requireAreaAccess(entityId) : requireProjectAccess(entityId);
}

/** Todas as linhas de uma entidade+ano → { line: number[12] }. */
export async function getFinancialLines(
  entityType: FinEntity,
  entityId: string,
  year: number
): Promise<Record<FinLine, number[]>> {
  await assertCanView(entityType, entityId);
  const rows = await db
    .select()
    .from(financialLines)
    .where(and(eq(financialLines.entityType, entityType), eq(financialLines.entityId, entityId), eq(financialLines.year, year)));
  const out = Object.fromEntries(ALL_LINES.map((l) => [l, zeros()])) as Record<FinLine, number[]>;
  for (const r of rows) {
    out[r.line as FinLine] = MONTH_KEYS.map((k) => Number(r[k as keyof typeof r] ?? 0));
  }
  return out;
}

function monthFields(months: number[]): Record<string, string> {
  return Object.fromEntries(MONTH_KEYS.map((k, i) => [k, String(Number(months[i] ?? 0))]));
}

/** Salva 1 linha (12 meses) + registra no log por campo cada mês alterado. */
export async function saveFinancialLine(input: {
  entityType: FinEntity;
  entityId: string;
  year: number;
  line: FinLine;
  months: number[]; // length 12
  note?: string;
}) {
  if (!ALL_LINES.includes(input.line)) throw new AuthorizationError("Linha inválida.");
  const session = await assertCanEdit(input.entityType, input.entityId);
  const userId = session.user.id;

  // valores antigos p/ o diff do log
  const [prev] = await db
    .select()
    .from(financialLines)
    .where(and(eq(financialLines.entityType, input.entityType), eq(financialLines.entityId, input.entityId), eq(financialLines.year, input.year), eq(financialLines.line, input.line)))
    .limit(1);
  const old = prev ? MONTH_KEYS.map((k) => Number(prev[k as keyof typeof prev] ?? 0)) : zeros();

  const fields = monthFields(input.months);
  await db
    .insert(financialLines)
    .values({ entityType: input.entityType, entityId: input.entityId, year: input.year, line: input.line, updatedBy: userId, updatedAt: new Date(), ...fields } as typeof financialLines.$inferInsert)
    .onConflictDoUpdate({
      target: [financialLines.entityType, financialLines.entityId, financialLines.year, financialLines.line],
      set: { ...fields, updatedBy: userId, updatedAt: new Date() },
    });

  // log por campo (mês a mês) — base do freeze + auditoria
  const logs = [];
  for (let i = 0; i < 12; i++) {
    if (Number(old[i]) !== Number(input.months[i] ?? 0)) {
      logs.push({
        entityType: input.entityType, entityId: input.entityId, year: input.year, line: input.line,
        month: i + 1, oldValue: String(old[i]), newValue: String(input.months[i] ?? 0),
        note: input.note ?? null, changedBy: userId,
      });
    }
  }
  if (logs.length) await db.insert(financialLineLog).values(logs);

  revalidatePath("/", "layout");
  return { changed: logs.length };
}

/** Anos com dados (sempre inclui o ano atual). */
export async function getFinancialLineYears(entityType: FinEntity, entityId: string): Promise<number[]> {
  await assertCanView(entityType, entityId);
  const rows = await db
    .selectDistinct({ year: financialLines.year })
    .from(financialLines)
    .where(and(eq(financialLines.entityType, entityType), eq(financialLines.entityId, entityId)));
  const years = new Set(rows.map((r) => r.year));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => a - b);
}
