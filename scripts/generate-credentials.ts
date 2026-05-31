/**
 * Gera uma senha única por usuário, grava o hash no banco e escreve uma lista
 * legível (credenciais + o que cada um acessa pela sua área) num arquivo LOCAL
 * gitignored. NUNCA commitar a saída.
 *
 * Uso:  DATABASE_URL=... tsx scripts/generate-credentials.ts [arquivo-saida]
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import * as schema from "../src/db/schema";

function genPassword(): string {
  // legível mas única: 10 chars base64url sem ambiguidade
  return randomBytes(8).toString("base64url").slice(0, 10);
}

function accessFor(role: string, areaName: string | null): string {
  if (role === "admin")
    return "Acesso total: vê e edita TODAS as áreas, usuários, financeiro e automações.";
  if (role === "head")
    return `Head de ${areaName ?? "(sem área)"}: gerencia projetos, KPIs, financeiro e automações de ${areaName ?? "?"}; contribui em tarefas/notas. Outras áreas: sem acesso.`;
  if (areaName)
    return `Membro de ${areaName}: cria/edita tarefas e notas de ${areaName} e vê os dados da área. NÃO edita financeiro nem acessa outras áreas.`;
  return "Sem área atribuída: acesso de leitura limitado até um admin definir a área.";
}

async function main() {
  const outPath = process.argv[2] ?? "credentials.local.txt";
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      areaName: schema.areas.name,
    })
    .from(schema.users)
    .leftJoin(schema.areas, eq(schema.users.areaId, schema.areas.id))
    .orderBy(schema.users.role);

  const lines: string[] = [];
  lines.push("BETTER CONTROL — CREDENCIAIS E ACESSOS");
  lines.push("Confidencial. Compartilhe por canal seguro e oriente a troca de senha.");
  lines.push("=".repeat(78));
  lines.push("");

  for (const u of rows) {
    const password = genPassword();
    const passwordHash = await hash(password, 12);
    await db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, u.id));

    lines.push(`Nome:    ${u.name}`);
    lines.push(`Login:   ${u.email}`);
    lines.push(`Senha:   ${password}`);
    lines.push(`Papel:   ${u.role}${u.areaName ? `  ·  Área: ${u.areaName}` : ""}`);
    lines.push(`Acesso:  ${accessFor(u.role, u.areaName)}`);
    lines.push("-".repeat(78));
  }

  lines.push("");
  lines.push(`Gerado para ${rows.length} usuários.`);

  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`OK: ${rows.length} senhas geradas e gravadas no banco.`);
  console.log(`Lista salva em: ${outPath} (gitignored — não commitar)`);
}

main().catch((e) => {
  console.error("Falha:", e);
  process.exit(1);
});
