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

// receita = área que gera receita (forecast/budget/actual + custo).
// suporte = centro de custo/entrega (valor gerado manual + custo + deadlines).
export const areaProfileEnum = pgEnum("area_profile", ["receita", "suporte"]);

export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  headId: uuid("head_id").references(() => users.id),
  // Regra dos 30x: meta de geração = targetMultiplier × custo.
  profile: areaProfileEnum("profile").notNull().default("receita"),
  targetMultiplier: numeric("target_multiplier", { precision: 6, scale: 2 })
    .notNull()
    .default("30"),
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

// --- Financial planning grid -------------------------------------------------
// Forecast / Budget / Actual por mês, por ano, para uma área OU um projeto.
// Polimórfico (mesmo padrão de `notes`): entityType + entityId. Cada registro é
// uma "linha horizontal" da grade (12 colunas m1..m12). Área e projeto são
// preenchidos de forma independente (decisão de produto).
export const financialEntityEnum = pgEnum("financial_entity", ["area", "project"]);
export const financialMetricEnum = pgEnum("financial_metric", [
  "forecast",
  "budget",
  "actual",
]);
// receita: usa forecast/budget/actual · custo: budget/actual · valor_gerado: actual (manual, p/ áreas de suporte)
export const financialStreamEnum = pgEnum("financial_stream", [
  "receita",
  "custo",
  "valor_gerado",
]);

export const financialPlans = pgTable(
  "financial_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: financialEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    year: integer("year").notNull(),
    stream: financialStreamEnum("stream").notNull().default("receita"),
    metric: financialMetricEnum("metric").notNull(),
    m1: numeric("m1", { precision: 14, scale: 2 }).notNull().default("0"),
    m2: numeric("m2", { precision: 14, scale: 2 }).notNull().default("0"),
    m3: numeric("m3", { precision: 14, scale: 2 }).notNull().default("0"),
    m4: numeric("m4", { precision: 14, scale: 2 }).notNull().default("0"),
    m5: numeric("m5", { precision: 14, scale: 2 }).notNull().default("0"),
    m6: numeric("m6", { precision: 14, scale: 2 }).notNull().default("0"),
    m7: numeric("m7", { precision: 14, scale: 2 }).notNull().default("0"),
    m8: numeric("m8", { precision: 14, scale: 2 }).notNull().default("0"),
    m9: numeric("m9", { precision: 14, scale: 2 }).notNull().default("0"),
    m10: numeric("m10", { precision: 14, scale: 2 }).notNull().default("0"),
    m11: numeric("m11", { precision: 14, scale: 2 }).notNull().default("0"),
    m12: numeric("m12", { precision: 14, scale: 2 }).notNull().default("0"),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("financial_plans_unique_idx").on(
      table.entityType,
      table.entityId,
      table.year,
      table.stream,
      table.metric
    ),
  ]
);

// --- Rateio de tempo/custo dos colaboradores ---------------------------------
// Modelo HÍBRIDO (decisão de produto):
//  · `allocations`     = % de tempo PLANEJADO por pessoa/projeto/mês (head define).
//  · `timeEntries`     = minutos REAIS lançados (voz/manual), capturados sem fricção.
//  · `collaboratorCost`= custo mensal carregado (salário+encargos) + capacidade.
// O rateio de custo por projeto usa o REAL (minutos) quando existe; se a pessoa
// não lançou tempo no mês, cai para o PLANEJADO (%). Math pura em `src/lib/rateio.ts`.

/** Origem do lançamento de tempo. `voice` = via comando de voz (baixa fricção). */
export const timeEntrySourceEnum = pgEnum("time_entry_source", [
  "manual",
  "voice",
  "timer",
]);

/**
 * Custo carregado do colaborador por mês. Dado sensível (salário) — só admin
 * lê/escreve (guard em actions). `capacityMinutes` = minutos úteis no mês,
 * usado para detectar sub/sobre-alocação. Único por (user, ano, mês).
 */
export const collaboratorCost = pgTable(
  "collaborator_cost",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    monthlyCost: numeric("monthly_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    capacityMinutes: integer("capacity_minutes").notNull().default(9600), // ~160h/mês
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("collaborator_cost_unique_idx").on(table.userId, table.year, table.month),
  ]
);

/**
 * % de tempo PLANEJADO de uma pessoa num projeto, por mês. A soma por pessoa/mês
 * deve ficar ~100% (validado na action, não no banco). Único por (user, projeto, ano, mês).
 */
export const allocations = pgTable(
  "allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    percent: numeric("percent", { precision: 5, scale: 2 }).notNull().default("0"),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("allocations_unique_idx").on(
      table.userId,
      table.projectId,
      table.year,
      table.month
    ),
  ]
);

/**
 * Minutos REAIS gastos por uma pessoa num projeto, num dia. Append-only (cada
 * lançamento é uma linha) — o agregado mensal é somado na leitura. É a fonte do
 * "minuto que cada colaborador gasta em cada projeto".
 */
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  minutes: integer("minutes").notNull(),
  source: timeEntrySourceEnum("source").notNull().default("manual"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// --- Centro de custo + ledger de despesas (espelho OMIE/BMA) ------------------
// `expenses` = espelho consolidado das despesas/pessoas (fonte: OMIE Better +
// BMA folha, deduplicado). Sincronizado por `scripts/sync-expenses.ts` (hoje do
// snapshot do better-financeiro; depois apontará pro banco `financeiro` ao vivo).
// `costCenters` = camada de categorização (liga a uma área p/ alimentar o rateio).
// `supplierCostCenter` = regra persistente nome→centro: sobrevive ao re-sync, então
// novos lançamentos do mesmo fornecedor já entram categorizados.

export const expenseKindEnum = pgEnum("expense_kind", ["fornecedor", "pessoa"]);

export const costCenters = pgTable("cost_centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  areaId: uuid("area_id").references(() => areas.id),
  color: text("color").notNull().default("#64748B"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // chave sintética estável p/ upsert idempotente no sync.
    externalKey: text("external_key").notNull(),
    source: text("source").notNull(), // 'omie' | 'bma'
    kind: expenseKindEnum("kind").notNull(),
    name: text("name").notNull(), // fornecedor ou pessoa (rótulo exibido)
    // Identidade da entidade: CPF/CNPJ quando disponível. É a chave de
    // consolidação — nomes variam ("Helen Mendes" vs "HELEN CRISTHI..."), o
    // documento não. Vem completo com a conexão live do banco `financeiro`.
    taxId: text("tax_id"),
    // entityKey = taxId quando existe, senão nome normalizado. Categorização e
    // agregação colam NESTA chave (não no nome cru).
    entityKey: text("entity_key").notNull().default(""),
    category: text("category"), // categoria OMIE
    bucket: text("bucket"), // "projeto" contábil do OMIE
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull().default("0"),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("expenses_external_key_idx").on(table.externalKey)]
);

/** Regra fornecedor/pessoa → centro de custo, reaplicada a cada sync. */
export const supplierCostCenter = pgTable("supplier_cost_center", {
  name: text("name").primaryKey(),
  costCenterId: uuid("cost_center_id")
    .references(() => costCenters.id, { onDelete: "cascade" })
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
