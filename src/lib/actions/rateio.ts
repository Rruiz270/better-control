"use server";

import { db } from "@/db";
import {
  timeEntries,
  allocations,
  collaboratorCost,
  projects,
  users,
  financialPlans,
  areas,
  activityLog,
  expenses,
  costCenters,
} from "@/db/schema";
import { and, eq, gte, lt, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  requireSession,
  requireProjectAccess,
  isAdmin,
  editablePeopleFor,
  AuthorizationError,
  type SessionUser,
} from "@/lib/authorization";
import {
  apportionPersonCost,
  rollupByProject,
  contribution,
  type ProjectShare,
} from "@/lib/rateio";

// --- helpers -----------------------------------------------------------------

/** Primeiro e último instante (exclusivo) de um mês, como strings YYYY-MM-DD. */
function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const from = `${year}-${mm}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

async function assertAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) {
    throw new AuthorizationError("Apenas admin pode gerenciar custos.");
  }
  return session;
}

// --- 0) Contexto p/ os editores (pessoas + projetos no escopo do usuário) ----

export type RateioContext = {
  canManageCost: boolean; // só admin edita salário
  users: { id: string; name: string; areaId: string | null; areaName: string | null }[];
  projects: { id: string; name: string; areaId: string }[];
};

export async function getRateioContext(): Promise<RateioContext> {
  const session = await requireSession();
  const user = session.user as SessionUser;

  // Pessoas que o usuário pode preencher (admin = todos; head = área; +subárvore).
  const editable = await editablePeopleFor(user);
  const allUsers = await db
    .select({ id: users.id, name: users.name, areaId: users.areaId, areaName: areas.name })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id));
  const people = editable ? allUsers.filter((u) => editable.has(u.id)) : allUsers;

  if (people.length === 0) throw new AuthorizationError("Sem pessoas para preencher.");

  // Projetos das áreas dessas pessoas (admin = todos).
  const areaIds = new Set(people.map((u) => u.areaId).filter(Boolean) as string[]);
  const allProjects = await db
    .select({ id: projects.id, name: projects.name, areaId: projects.areaId })
    .from(projects);
  const projectRows = editable ? allProjects.filter((p) => areaIds.has(p.areaId)) : allProjects;

  return {
    canManageCost: user.role === "admin",
    users: people.map((u) => ({ id: u.id, name: u.name, areaId: u.areaId, areaName: u.areaName })),
    projects: projectRows,
  };
}

/** Matriz pessoas × projetos (🅐): linhas = pessoas editáveis, colunas = projetos,
 * células = % de alocação do mês. Usado pelo Raphael Lima p/ alocar professores por curso. */
export async function getRateioMatrix(year: number, month: number) {
  const ctx = await getRateioContext();
  const userIds = ctx.users.map((u) => u.id);
  const allocs = userIds.length
    ? await db
        .select({ userId: allocations.userId, projectId: allocations.projectId, percent: allocations.percent })
        .from(allocations)
        .where(and(inArray(allocations.userId, userIds), eq(allocations.year, year), eq(allocations.month, month)))
    : [];
  return {
    users: ctx.users,
    projects: ctx.projects,
    allocations: allocs.map((a) => ({ userId: a.userId, projectId: a.projectId, percent: Number(a.percent) })),
  };
}

/** Custo mensal de uma pessoa. SENSÍVEL → só admin; demais recebem null. */
export async function getCollaboratorCost(
  userId: string,
  year: number,
  month: number
): Promise<number | null> {
  const session = await requireSession();
  if (!isAdmin(session.user as SessionUser)) return null;
  const [row] = await db
    .select()
    .from(collaboratorCost)
    .where(
      and(
        eq(collaboratorCost.userId, userId),
        eq(collaboratorCost.year, year),
        eq(collaboratorCost.month, month)
      )
    )
    .limit(1);
  return row ? Number(row.monthlyCost) : null;
}

// --- 1) Lançar tempo REAL (baixa fricção, member contribui) ------------------

export async function logTime(input: {
  projectId: string;
  minutes: number;
  date?: string; // YYYY-MM-DD; default hoje
  note?: string;
  source?: "manual" | "voice" | "timer";
}) {
  const session = await requireProjectAccess(input.projectId, { contributor: true });
  if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
    throw new AuthorizationError("Minutos inválidos.");
  }
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const entryId = crypto.randomUUID();

  await db.batch([
    db.insert(timeEntries).values({
      id: entryId,
      userId: session.user.id,
      projectId: input.projectId,
      date,
      minutes: Math.round(input.minutes),
      source: input.source ?? "manual",
      note: input.note,
    }),
    db.insert(activityLog).values({
      userId: session.user.id,
      entityType: "project",
      entityId: input.projectId,
      action: "time_logged",
      details: { minutes: Math.round(input.minutes), via: input.source ?? "manual" },
    }),
  ]);

  revalidatePath("/", "layout");
  return { id: entryId };
}

// --- 2) Alocação PLANEJADA (head/admin definem o % por pessoa) ---------------

export async function setAllocation(input: {
  userId: string;
  projectId: string;
  year: number;
  month: number;
  percent: number;
}) {
  // Gerenciar estrutura de rateio é ação de gestão da área do projeto.
  const session = await requireProjectAccess(input.projectId);
  if (input.percent < 0 || input.percent > 100) {
    throw new AuthorizationError("Percentual deve estar entre 0 e 100.");
  }

  // Escopo do alvo: não-admin só preenche quem está na sua árvore (área que
  // lidera + subárvore de reportes). Modela "head preenche pelos de baixo".
  const user = session.user as SessionUser;
  if (!isAdmin(user)) {
    const editable = await editablePeopleFor(user);
    if (editable && !editable.has(input.userId)) {
      throw new AuthorizationError("Você não pode preencher o rateio dessa pessoa.");
    }
  }

  await db
    .insert(allocations)
    .values({
      userId: input.userId,
      projectId: input.projectId,
      year: input.year,
      month: input.month,
      percent: String(input.percent),
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        allocations.userId,
        allocations.projectId,
        allocations.year,
        allocations.month,
      ],
      set: { percent: String(input.percent), updatedBy: session.user.id, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
}

/** Copia as alocações do mês anterior p/ o mês atual (nudge de preenchimento). */
export async function copyAllocationsFromPreviousMonth(userId: string, year: number, month: number) {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (!isAdmin(user)) {
    if (user.role !== "head") throw new AuthorizationError("Somente heads e admins lançam rateio.");
    const editable = await editablePeopleFor(user);
    if (editable && !editable.has(userId)) throw new AuthorizationError("Fora do seu escopo.");
  }
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prev = await db.select().from(allocations).where(and(eq(allocations.userId, userId), eq(allocations.year, prevYear), eq(allocations.month, prevMonth)));
  let n = 0;
  for (const p of prev) {
    await db.insert(allocations).values({ userId, projectId: p.projectId, year, month, percent: p.percent, updatedBy: user.id })
      .onConflictDoUpdate({ target: [allocations.userId, allocations.projectId, allocations.year, allocations.month], set: { percent: p.percent, updatedBy: user.id, updatedAt: new Date() } });
    n++;
  }
  revalidatePath("/", "layout");
  return { copied: n };
}

/** % planejado de uma pessoa no mês + alerta se a soma não fechar 100%. */
export async function getAllocationsForUser(userId: string, year: number, month: number) {
  await requireSession();
  const rows = await db
    .select({
      projectId: allocations.projectId,
      percent: allocations.percent,
      projectName: projects.name,
    })
    .from(allocations)
    .innerJoin(projects, eq(allocations.projectId, projects.id))
    .where(
      and(
        eq(allocations.userId, userId),
        eq(allocations.year, year),
        eq(allocations.month, month)
      )
    );
  const total = rows.reduce((s, r) => s + Number(r.percent), 0);
  return { rows, total, balanced: Math.abs(total - 100) < 0.01 };
}

// --- 3) Custo carregado do colaborador (SENSÍVEL → só admin) -----------------

export async function setCollaboratorCost(input: {
  userId: string;
  year: number;
  month: number;
  monthlyCost: number;
  capacityMinutes?: number;
  note?: string;
}) {
  const session = await assertAdmin();
  // 🅓 valor manual exige nota explicativa.
  if (input.monthlyCost > 0 && !(input.note ?? "").trim()) {
    throw new AuthorizationError("Nota explicativa é obrigatória ao lançar valor manual.");
  }
  const note = input.note?.trim() || null;
  await db
    .insert(collaboratorCost)
    .values({
      userId: input.userId,
      year: input.year,
      month: input.month,
      monthlyCost: String(input.monthlyCost),
      capacityMinutes: input.capacityMinutes ?? 9600,
      note,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [collaboratorCost.userId, collaboratorCost.year, collaboratorCost.month],
      set: {
        monthlyCost: String(input.monthlyCost),
        note,
        ...(input.capacityMinutes != null ? { capacityMinutes: input.capacityMinutes } : {}),
        updatedBy: session.user.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/", "layout");
}

/** Grid de custo manual por colaborador (admin): todos + custo/nota do mês. */
export async function getCollaboratorCosts(year: number, month: number) {
  await assertAdmin();
  const us = await db
    .select({ id: users.id, name: users.name, role: users.role, status: users.status, areaName: areas.name })
    .from(users)
    .leftJoin(areas, eq(users.areaId, areas.id))
    .where(ne(users.status, "placeholder"))
    .orderBy(users.name);
  const costs = await db
    .select()
    .from(collaboratorCost)
    .where(and(eq(collaboratorCost.year, year), eq(collaboratorCost.month, month)));
  const byUser = new Map(costs.map((c) => [c.userId, c]));
  return us.map((u) => ({
    id: u.id, name: u.name, role: u.role, status: u.status, areaName: u.areaName,
    monthlyCost: Number(byUser.get(u.id)?.monthlyCost ?? 0),
    note: byUser.get(u.id)?.note ?? "",
  }));
}

// --- 4) Rollup de rateio: custo + minutos + contribuição por projeto --------

export type RateioProjectRow = {
  projectId: string;
  projectName: string;
  areaId: string;
  minutes: number;
  cost: number;
  contributors: number;
  valueGenerated: number;
  net: number;
  ratio: number | null;
};

/**
 * Para um mês: rateia o custo de cada pessoa entre projetos (real→planejado),
 * agrega por projeto e cruza com o valor gerado (financials actual) para a
 * contribuição. Admin vê tudo; head só a própria área; member não acessa.
 */
export async function getRateioRollup(
  year: number,
  month: number
): Promise<RateioProjectRow[]> {
  const session = await requireSession();
  const user = session.user as SessionUser;
  if (user.role === "member") throw new AuthorizationError();

  const { from, to } = monthRange(year, month);

  // Projetos no escopo (admin: todos; head: da sua área).
  const projectRows = await db
    .select({ id: projects.id, name: projects.name, areaId: projects.areaId, areaProfile: areas.profile })
    .from(projects)
    .innerJoin(areas, eq(projects.areaId, areas.id))
    .where(user.role === "admin" ? undefined : eq(projects.areaId, user.areaId ?? "__none__"));

  if (projectRows.length === 0) return [];
  const scopeIds = new Set(projectRows.map((p) => p.id));

  // Custo do mês por pessoa = REAL (despesas/folha via CPF/CNPJ) quando há match;
  // senão o salário manual (collaboratorCost). Fecha o ciclo despesa→rateio→30x.
  const costs = await db
    .select()
    .from(collaboratorCost)
    .where(and(eq(collaboratorCost.year, year), eq(collaboratorCost.month, month)));
  const manualByUser = new Map(costs.map((c) => [c.userId, Number(c.monthlyCost)]));

  // Custo real de PESSOA = só a categoria "Despesa com Pessoal" (salário). Assim
  // gastos no cartão da pessoa (escritório/software etc.) NÃO inflam o custo dela
  // no rateio — esses viram custo da empresa nas outras categorias. (Requer a
  // OMIE quebrar cada lançamento na categoria certa; senão cai pro manual.)
  const [pessoalCc] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.slug, "despesa-com-pessoal"))
    .limit(1);
  const expRows = await db
    .select({ entityKey: expenses.entityKey, value: expenses.value })
    .from(expenses)
    .where(
      and(
        eq(expenses.year, year),
        eq(expenses.month, month),
        pessoalCc ? eq(expenses.costCenterId, pessoalCc.id) : eq(expenses.costCenterId, "__none__")
      )
    );
  const realByEntity = new Map<string, number>();
  for (const e of expRows) realByEntity.set(e.entityKey, (realByEntity.get(e.entityKey) ?? 0) + Number(e.value));

  // taxId por usuário (ponte). Custo efetivo = real(taxId) ?? manual ?? 0.
  const userTax = await db.select({ id: users.id, taxId: users.taxId }).from(users);
  const costByUser = new Map<string, number>();
  for (const u of userTax) {
    const real = u.taxId ? realByEntity.get(u.taxId) : undefined;
    const cost = real ?? manualByUser.get(u.id) ?? 0;
    if (cost > 0) costByUser.set(u.id, cost);
  }

  // Tempo real do mês (todas as pessoas), agregado por pessoa→projeto.
  const entries = await db
    .select({ userId: timeEntries.userId, projectId: timeEntries.projectId, minutes: timeEntries.minutes })
    .from(timeEntries)
    .where(and(gte(timeEntries.date, from), lt(timeEntries.date, to)));

  // Alocação planejada do mês.
  const plans = await db
    .select({ userId: allocations.userId, projectId: allocations.projectId, percent: allocations.percent })
    .from(allocations)
    .where(and(eq(allocations.year, year), eq(allocations.month, month)));

  // Indexa por pessoa.
  const minutesByUser = new Map<string, Record<string, number>>();
  for (const e of entries) {
    if (!scopeIds.has(e.projectId)) continue;
    const m = minutesByUser.get(e.userId) ?? {};
    m[e.projectId] = (m[e.projectId] ?? 0) + e.minutes;
    minutesByUser.set(e.userId, m);
  }
  const plannedByUser = new Map<string, Record<string, number>>();
  for (const p of plans) {
    if (!scopeIds.has(p.projectId)) continue;
    const m = plannedByUser.get(p.userId) ?? {};
    m[p.projectId] = (m[p.projectId] ?? 0) + Number(p.percent);
    plannedByUser.set(p.userId, m);
  }

  // Rateia cada pessoa que tem custo definido.
  const perPerson: ProjectShare[][] = [];
  for (const [userId, monthlyCost] of costByUser) {
    perPerson.push(
      apportionPersonCost(
        monthlyCost,
        minutesByUser.get(userId) ?? {},
        plannedByUser.get(userId) ?? {}
      )
    );
  }
  const roll = rollupByProject(perPerson);
  const rollById = new Map(roll.map((r) => [r.projectId, r]));

  // Valor gerado por projeto (financials actual do mês): receita p/ áreas de
  // receita, valor_gerado p/ áreas de suporte.
  const fin = await db
    .select()
    .from(financialPlans)
    .where(
      and(
        eq(financialPlans.entityType, "project"),
        eq(financialPlans.year, year),
        inArray(financialPlans.entityId, Array.from(scopeIds))
      )
    );
  const monthCol = `m${month}` as keyof (typeof fin)[number];
  const valueByProject = new Map<string, number>();
  for (const row of fin) {
    if (row.metric !== "actual") continue;
    const profile = projectRows.find((p) => p.id === row.entityId)?.areaProfile;
    const wantStream = profile === "suporte" ? "valor_gerado" : "receita";
    if (row.stream !== wantStream) continue;
    valueByProject.set(row.entityId, Number(row[monthCol] ?? 0));
  }

  return projectRows.map((p) => {
    const r = rollById.get(p.id);
    const cost = r?.cost ?? 0;
    const value = valueByProject.get(p.id) ?? 0;
    const c = contribution(p.id, value, cost);
    return {
      projectId: p.id,
      projectName: p.name,
      areaId: p.areaId,
      minutes: r?.minutes ?? 0,
      cost,
      contributors: r?.contributors ?? 0,
      valueGenerated: value,
      net: c.net,
      ratio: c.ratio,
    };
  });
}
