"use server";

import { db } from "@/db";
import { kpis, kpiHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/authorization";

export async function getKpisByProject(projectId: string) {
  return db.select().from(kpis).where(eq(kpis.projectId, projectId));
}

export async function createKpi(data: {
  projectId: string;
  name: string;
  category: "financial" | "operational" | "commercial";
  type: "currency" | "percentage" | "number" | "ratio";
  targetValue?: string;
  currentValue?: string;
  unit?: string;
  period?: string;
}) {
  await requireSession();
  const [kpi] = await db
    .insert(kpis)
    .values({ ...data, isCustom: true })
    .returning();

  revalidatePath("/", "layout");
  return kpi;
}

export async function updateKpi(
  kpiId: string,
  data: { currentValue?: string; targetValue?: string; period?: string }
) {
  await requireSession();

  const [existing] = await db
    .select()
    .from(kpis)
    .where(eq(kpis.id, kpiId))
    .limit(1);

  if (data.currentValue && existing) {
    await db.insert(kpiHistory).values({
      kpiId,
      value: data.currentValue,
      period: data.period || existing.period || new Date().toISOString().slice(0, 7),
    });
  }

  await db
    .update(kpis)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(kpis.id, kpiId));

  revalidatePath("/", "layout");
}

export async function deleteKpi(kpiId: string) {
  await requireSession();
  await db.delete(kpis).where(eq(kpis.id, kpiId));
  revalidatePath("/", "layout");
}

export async function getKpiHistory(kpiId: string) {
  return db
    .select()
    .from(kpiHistory)
    .where(eq(kpiHistory.kpiId, kpiId))
    .orderBy(kpiHistory.recordedAt);
}
