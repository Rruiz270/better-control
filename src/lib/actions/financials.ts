"use server";

import { db } from "@/db";
import { financialPlans, projects } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireAreaAccess,
  requireProjectAccess,
  canViewArea,
  AuthorizationError,
  type SessionUser,
} from "@/lib/authorization";

export type FinancialEntityType = "area" | "project";
export type FinancialStream = "receita" | "custo" | "valor_gerado";
export type FinancialMetric = "forecast" | "budget" | "actual";

/** Quais métricas cada stream usa. (Local: arquivos "use server" só exportam funções async.) */
const STREAM_METRICS: Record<FinancialStream, FinancialMetric[]> = {
  receita: ["forecast", "budget", "actual"],
  custo: ["budget", "actual"],
  valor_gerado: ["actual"],
};

/** Todos os streams/métricas de uma entidade+ano. months sempre length 12. */
export type FinancialData = {
  receita: Record<"forecast" | "budget" | "actual", number[]>;
  custo: Record<"budget" | "actual", number[]>;
  valor_gerado: Record<"actual", number[]>;
};

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => `m${i + 1}` as const);
const zeros = () => Array(12).fill(0) as number[];

function emptyData(): FinancialData {
  return {
    receita: { forecast: zeros(), budget: zeros(), actual: zeros() },
    custo: { budget: zeros(), actual: zeros() },
    valor_gerado: { actual: zeros() },
  };
}

async function areaIdForProject(projectId: string): Promise<string | null> {
  const [row] = await db
    .select({ areaId: projects.areaId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return row?.areaId ?? null;
}

/** Financials are sensitive: non-admins can only view their own area. */
async function assertCanView(entityType: FinancialEntityType, entityId: string) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (user.role === "admin") return session;
  const areaId = entityType === "area" ? entityId : await areaIdForProject(entityId);
  if (!areaId || !canViewArea(user, areaId)) throw new AuthorizationError();
  return session;
}

/** Editing budgets/financials is a management action (admin or area head). */
async function assertCanEdit(entityType: FinancialEntityType, entityId: string) {
  return entityType === "area"
    ? requireAreaAccess(entityId)
    : requireProjectAccess(entityId);
}

export async function getFinancials(
  entityType: FinancialEntityType,
  entityId: string,
  year: number
): Promise<FinancialData> {
  await assertCanView(entityType, entityId);

  const rows = await db
    .select()
    .from(financialPlans)
    .where(
      and(
        eq(financialPlans.entityType, entityType),
        eq(financialPlans.entityId, entityId),
        eq(financialPlans.year, year)
      )
    );

  const data = emptyData();
  for (const row of rows) {
    const stream = row.stream as FinancialStream;
    const metric = row.metric as FinancialMetric;
    const months = MONTH_KEYS.map((k) => Number(row[k as keyof typeof row] ?? 0));
    // metric may not exist on every stream's type, but the DB guarantees valid combos.
    (data[stream] as Record<string, number[]>)[metric] = months;
  }
  return data;
}

/** Distinct years that already have data, always including the current year. */
export async function getPlanYears(
  entityType: FinancialEntityType,
  entityId: string
): Promise<number[]> {
  await assertCanView(entityType, entityId);

  const rows = await db
    .selectDistinct({ year: financialPlans.year })
    .from(financialPlans)
    .where(
      and(
        eq(financialPlans.entityType, entityType),
        eq(financialPlans.entityId, entityId)
      )
    );

  const years = new Set(rows.map((r) => r.year));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => a - b);
}

function monthFields(months: number[]): Record<string, string> {
  return Object.fromEntries(
    MONTH_KEYS.map((k, i) => [k, String(Number(months[i] ?? 0))])
  );
}

/** Upsert one (stream, metric) row for an entity+year. */
export async function saveFinancialRow(input: {
  entityType: FinancialEntityType;
  entityId: string;
  year: number;
  stream: FinancialStream;
  metric: FinancialMetric;
  months: number[]; // length 12
}) {
  if (!STREAM_METRICS[input.stream]?.includes(input.metric)) {
    throw new AuthorizationError("Combinação de stream/métrica inválida.");
  }
  const session = await assertCanEdit(input.entityType, input.entityId);

  const fields = monthFields(input.months);
  const base = {
    entityType: input.entityType,
    entityId: input.entityId,
    year: input.year,
    stream: input.stream,
    metric: input.metric,
    updatedBy: session.user.id,
    updatedAt: new Date(),
    ...fields,
  } as typeof financialPlans.$inferInsert;

  await db
    .insert(financialPlans)
    .values(base)
    .onConflictDoUpdate({
      target: [
        financialPlans.entityType,
        financialPlans.entityId,
        financialPlans.year,
        financialPlans.stream,
        financialPlans.metric,
      ],
      set: { ...fields, updatedBy: session.user.id, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
}
