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
export type FinancialMetric = "forecast" | "budget" | "actual";

/** Forecast/Budget/Actual, cada um com 12 valores mensais (Jan..Dez). */
export type FinancialGrid = Record<FinancialMetric, number[]>;

const METRICS: FinancialMetric[] = ["forecast", "budget", "actual"];
const MONTH_KEYS = Array.from({ length: 12 }, (_, i) => `m${i + 1}` as const);

function emptyGrid(): FinancialGrid {
  return {
    forecast: Array(12).fill(0),
    budget: Array(12).fill(0),
    actual: Array(12).fill(0),
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

/** Editing budgets is a management action (admin or head of the area). */
async function assertCanEdit(entityType: FinancialEntityType, entityId: string) {
  return entityType === "area"
    ? requireAreaAccess(entityId)
    : requireProjectAccess(entityId);
}

export async function getFinancialGrid(
  entityType: FinancialEntityType,
  entityId: string,
  year: number
): Promise<FinancialGrid> {
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

  const grid = emptyGrid();
  for (const row of rows) {
    grid[row.metric as FinancialMetric] = MONTH_KEYS.map((k) =>
      Number(row[k as keyof typeof row] ?? 0)
    );
  }
  return grid;
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

/** Upsert one metric row (forecast/budget/actual) for an entity+year. */
export async function saveFinancialRow(input: {
  entityType: FinancialEntityType;
  entityId: string;
  year: number;
  metric: FinancialMetric;
  months: number[]; // length 12
}) {
  if (!METRICS.includes(input.metric)) {
    throw new AuthorizationError("Métrica inválida.");
  }
  const session = await assertCanEdit(input.entityType, input.entityId);

  const fields = monthFields(input.months);
  const base = {
    entityType: input.entityType,
    entityId: input.entityId,
    year: input.year,
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
        financialPlans.metric,
      ],
      set: { ...fields, updatedBy: session.user.id, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
}
