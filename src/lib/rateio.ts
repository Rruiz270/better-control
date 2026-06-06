/**
 * Pure cost-apportionment (rateio) math — NO database, NO imports.
 *
 * Kept separate from the db-backed action (rateio.ts em actions/) so the rules
 * can be unit-tested in isolation, exactly like `policy.ts` and `commandParser`.
 *
 * Modelo híbrido: o custo mensal de uma pessoa é dividido entre projetos pelo
 * REAL (minutos lançados) quando há lançamentos; senão pelo PLANEJADO (%).
 */

export type ProjectShare = {
  projectId: string;
  minutes: number;
  /** Fração do tempo da pessoa neste projeto (0..1). */
  fraction: number;
  /** Custo do colaborador rateado para este projeto. */
  cost: number;
  /** De onde veio a fração: tempo real lançado ou alocação planejada. */
  basis: "actual" | "planned" | "none";
};

/**
 * Rateia o custo mensal de UMA pessoa entre seus projetos.
 *
 * @param monthlyCost      custo carregado do colaborador no mês
 * @param minutesByProject minutos REAIS lançados por projeto (pode ser vazio)
 * @param plannedByProject % PLANEJADO por projeto (0..100), usado como fallback
 */
export function apportionPersonCost(
  monthlyCost: number,
  minutesByProject: Record<string, number>,
  plannedByProject: Record<string, number> = {}
): ProjectShare[] {
  const totalMinutes = Object.values(minutesByProject).reduce((a, b) => a + b, 0);

  // 1) Tem tempo real → rateia proporcional aos minutos (a fonte mais precisa).
  if (totalMinutes > 0) {
    return Object.entries(minutesByProject).map(([projectId, minutes]) => {
      const fraction = minutes / totalMinutes;
      return {
        projectId,
        minutes,
        fraction,
        cost: round2(monthlyCost * fraction),
        basis: "actual" as const,
      };
    });
  }

  // 2) Sem tempo real, mas tem plano → rateia pelo % planejado.
  const totalPlanned = Object.values(plannedByProject).reduce((a, b) => a + b, 0);
  if (totalPlanned > 0) {
    return Object.entries(plannedByProject).map(([projectId, percent]) => {
      const fraction = percent / totalPlanned; // normaliza, mesmo que ≠ 100
      return {
        projectId,
        minutes: 0,
        fraction,
        cost: round2(monthlyCost * fraction),
        basis: "planned" as const,
      };
    });
  }

  // 3) Sem nada → custo fica não-alocado (não inventa rateio).
  return [];
}

/** Soma `apportionPersonCost` de várias pessoas em um total por projeto. */
export type ProjectRollup = {
  projectId: string;
  cost: number;
  minutes: number;
  /** Pessoas que contribuíram para este projeto no período. */
  contributors: number;
};

export function rollupByProject(perPerson: ProjectShare[][]): ProjectRollup[] {
  const acc = new Map<string, ProjectRollup>();
  for (const shares of perPerson) {
    for (const s of shares) {
      const cur =
        acc.get(s.projectId) ??
        { projectId: s.projectId, cost: 0, minutes: 0, contributors: 0 };
      cur.cost = round2(cur.cost + s.cost);
      cur.minutes += s.minutes;
      cur.contributors += 1;
      acc.set(s.projectId, cur);
    }
  }
  return Array.from(acc.values());
}

/**
 * Contribuição efetiva = valor gerado pelo projeto − custo rateado a ele.
 * `ratio` é o múltiplo gerado/custo — a "regra dos 30x" da área aplicada ao projeto.
 */
export type Contribution = {
  projectId: string;
  valueGenerated: number;
  cost: number;
  net: number;
  ratio: number | null; // null quando custo = 0 (evita divisão por zero)
};

export function contribution(
  projectId: string,
  valueGenerated: number,
  cost: number
): Contribution {
  return {
    projectId,
    valueGenerated,
    cost,
    net: round2(valueGenerated - cost),
    ratio: cost > 0 ? round2(valueGenerated / cost) : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
