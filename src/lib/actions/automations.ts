"use server";

import { db } from "@/db";
import { automationRules, activityLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireAreaAccess,
  requireProjectAccess,
  requireRuleAccess,
  AuthorizationError,
  isAdmin,
  type SessionUser,
} from "@/lib/authorization";

export async function getAutomationRules() {
  return db.select().from(automationRules).orderBy(automationRules.createdAt);
}

export async function createAutomationRule(data: {
  name: string;
  trigger: "task_status_changed" | "task_overdue" | "task_assigned" | "project_status_changed" | "kpi_threshold";
  triggerConfig?: Record<string, unknown>;
  action: "send_notification" | "send_whatsapp" | "change_status" | "assign_user" | "create_activity";
  actionConfig?: Record<string, unknown>;
  areaId?: string;
  projectId?: string;
}) {
  // Scope the rule to whatever it targets: area heads manage their own area's
  // rules, project rules require project access, and global rules are admin-only.
  let session;
  if (data.areaId) {
    session = await requireAreaAccess(data.areaId);
  } else if (data.projectId) {
    session = await requireProjectAccess(data.projectId);
  } else {
    session = await requireSession();
    if (!isAdmin(session.user as SessionUser)) {
      throw new AuthorizationError("Apenas admins podem criar regras globais.");
    }
  }

  const [rule] = await db
    .insert(automationRules)
    .values({
      ...data,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/", "layout");
  return rule;
}

export async function toggleAutomationRule(ruleId: string, enabled: boolean) {
  await requireRuleAccess(ruleId);
  await db
    .update(automationRules)
    .set({ enabled })
    .where(eq(automationRules.id, ruleId));
  revalidatePath("/", "layout");
}

export async function deleteAutomationRule(ruleId: string) {
  await requireRuleAccess(ruleId);
  await db.delete(automationRules).where(eq(automationRules.id, ruleId));
  revalidatePath("/", "layout");
}

export async function evaluateRules(
  trigger: string,
  context: { taskId?: string; projectId?: string; areaId?: string; userId?: string; oldStatus?: string; newStatus?: string }
) {
  const rules = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.enabled, true));

  const matchingRules = rules.filter((r) => {
    if (r.trigger !== trigger) return false;
    if (r.projectId && r.projectId !== context.projectId) return false;
    if (r.areaId && r.areaId !== context.areaId) return false;

    const config = r.triggerConfig as Record<string, unknown> | null;
    if (config?.status && config.status !== context.newStatus) return false;

    return true;
  });

  for (const rule of matchingRules) {
    const actionConfig = rule.actionConfig as Record<string, unknown> | null;

    switch (rule.action) {
      case "create_activity":
        if (context.userId) {
          await db.insert(activityLog).values({
            userId: context.userId,
            entityType: "automation",
            entityId: rule.id,
            action: "triggered",
            details: {
              ruleName: rule.name,
              trigger,
              context,
            },
          });
        }
        break;

      case "send_notification":
        await db.insert(activityLog).values({
          userId: context.userId || rule.createdBy!,
          entityType: "notification",
          entityId: rule.id,
          action: "sent",
          details: {
            ruleName: rule.name,
            message: actionConfig?.message || `Automação: ${rule.name}`,
          },
        });
        break;

      case "send_whatsapp":
        await db.insert(activityLog).values({
          userId: context.userId || rule.createdBy!,
          entityType: "whatsapp",
          entityId: rule.id,
          action: "queued",
          details: {
            ruleName: rule.name,
            phone: actionConfig?.phone,
            message: actionConfig?.message || `Automação: ${rule.name}`,
          },
        });
        break;
    }
  }

  return matchingRules.length;
}
