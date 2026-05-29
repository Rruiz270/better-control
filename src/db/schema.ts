import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  pgEnum,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "head", "member"]);
export const projectStatusEnum = pgEnum("project_status", [
  "planejamento",
  "em_execucao",
  "pausado",
  "concluido",
  "descontinuado",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "nao_iniciada",
  "em_andamento",
  "concluida",
  "bloqueada",
  "cancelada",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "critica",
  "alta",
  "media",
  "baixa",
]);
export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "lead",
  "member",
  "viewer",
]);
export const kpiCategoryEnum = pgEnum("kpi_category", [
  "financial",
  "operational",
  "commercial",
]);
export const kpiTypeEnum = pgEnum("kpi_type", [
  "currency",
  "percentage",
  "number",
  "ratio",
]);
export const noteEntityTypeEnum = pgEnum("note_entity_type", [
  "project",
  "task",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  areaId: uuid("area_id"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  headId: uuid("head_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    areaId: uuid("area_id")
      .references(() => areas.id)
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("planejamento"),
    budget: numeric("budget", { precision: 12, scale: 2 }),
    forecast: numeric("forecast", { precision: 12, scale: 2 }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("projects_area_slug_idx").on(table.areaId, table.slug)]
);

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: projectMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("nao_iniciada"),
  priority: taskPriorityEnum("priority").notNull().default("media"),
  dueDate: date("due_date"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.userId] })]
);

export const kpis = pgTable("kpis", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  category: kpiCategoryEnum("category").notNull(),
  type: kpiTypeEnum("type").notNull(),
  targetValue: numeric("target_value", { precision: 14, scale: 4 }),
  currentValue: numeric("current_value", { precision: 14, scale: 4 }),
  unit: text("unit"),
  period: text("period"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const kpiHistory = pgTable("kpi_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  kpiId: uuid("kpi_id")
    .references(() => kpis.id, { onDelete: "cascade" })
    .notNull(),
  value: numeric("value", { precision: 14, scale: 4 }).notNull(),
  period: text("period").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: noteEntityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  content: text("content"),
  audioUrl: text("audio_url"),
  transcription: text("transcription"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    taskId: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    dependsOnId: uuid("depends_on_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.dependsOnId] })]
);

export const automationRuleEnum = pgEnum("automation_trigger", [
  "task_status_changed",
  "task_overdue",
  "task_assigned",
  "project_status_changed",
  "kpi_threshold",
]);

export const automationActionEnum = pgEnum("automation_action", [
  "send_notification",
  "send_whatsapp",
  "change_status",
  "assign_user",
  "create_activity",
]);

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: uuid("area_id").references(() => areas.id),
  projectId: uuid("project_id").references(() => projects.id),
  name: text("name").notNull(),
  trigger: automationRuleEnum("trigger").notNull(),
  triggerConfig: jsonb("trigger_config"),
  action: automationActionEnum("action").notNull(),
  actionConfig: jsonb("action_config"),
  enabled: boolean("enabled").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  endpoint: text("endpoint").notNull().unique(),
  keysP256dh: text("keys_p256dh").notNull(),
  keysAuth: text("keys_auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
