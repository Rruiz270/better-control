import { describe, it, expect } from "vitest";
import {
  apportionPersonCost,
  rollupByProject,
  contribution,
} from "./rateio";

describe("apportionPersonCost", () => {
  it("rateia pelo tempo real quando há minutos lançados", () => {
    const shares = apportionPersonCost(
      10000,
      { a: 90, b: 30 }, // 75% / 25%
      { a: 50, b: 50 } // plano é ignorado quando há real
    );
    const a = shares.find((s) => s.projectId === "a")!;
    const b = shares.find((s) => s.projectId === "b")!;
    expect(a.cost).toBe(7500);
    expect(b.cost).toBe(2500);
    expect(a.basis).toBe("actual");
  });

  it("cai para o planejado quando não há tempo real", () => {
    const shares = apportionPersonCost(10000, {}, { a: 60, b: 40 });
    const a = shares.find((s) => s.projectId === "a")!;
    expect(a.cost).toBe(6000);
    expect(a.basis).toBe("planned");
  });

  it("normaliza o planejado mesmo que não some 100%", () => {
    const shares = apportionPersonCost(10000, {}, { a: 30, b: 10 }); // soma 40
    const a = shares.find((s) => s.projectId === "a")!;
    expect(a.cost).toBe(7500); // 30/40
  });

  it("não inventa rateio sem tempo nem plano", () => {
    expect(apportionPersonCost(10000, {}, {})).toEqual([]);
  });

  it("o custo total rateado nunca excede o custo mensal", () => {
    const shares = apportionPersonCost(8000, { a: 1, b: 1, c: 1 });
    const total = shares.reduce((s, x) => s + x.cost, 0);
    expect(total).toBeCloseTo(8000, 1);
  });
});

describe("rollupByProject", () => {
  it("soma custo, minutos e conta contribuintes por projeto", () => {
    const p1 = apportionPersonCost(10000, { a: 60, b: 40 });
    const p2 = apportionPersonCost(5000, { a: 100 });
    const roll = rollupByProject([p1, p2]);
    const a = roll.find((r) => r.projectId === "a")!;
    expect(a.cost).toBe(11000); // 6000 + 5000
    expect(a.contributors).toBe(2);
  });
});

describe("contribution", () => {
  it("calcula líquido e o múltiplo (regra dos 30x)", () => {
    const c = contribution("p", 300000, 10000);
    expect(c.net).toBe(290000);
    expect(c.ratio).toBe(30);
  });

  it("ratio é null quando custo é zero", () => {
    expect(contribution("p", 100, 0).ratio).toBeNull();
  });
});
