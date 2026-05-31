import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Regressão: um arquivo "use server" só pode exportar funções async. Um
// `export const`/objeto quebra TODAS as server actions das páginas que o
// importam (erro "A use server file can only export async functions"). Já
// aconteceu uma vez (STREAM_METRICS em financials.ts). Este teste varre os
// arquivos de actions e barra exports não-função.
const dir = join(process.cwd(), "src/lib/actions");
const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

describe("server actions são seguros para 'use server'", () => {
  it("encontra arquivos de actions", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");

    it(`${f} começa com a diretiva "use server"`, () => {
      expect(src.trimStart().startsWith('"use server"')).toBe(true);
    });

    it(`${f} não exporta const/let/var/class/default`, () => {
      const illegal = src.match(/^\s*export\s+(const|let|var|class|default)\b/m);
      expect(illegal, `export ilegal em ${f}: ${illegal?.[0]}`).toBeNull();
    });
  }
});
