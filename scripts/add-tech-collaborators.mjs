/**
 * One-off: sobe 3 colaboradores na vertical Better Tech.
 * Senha padrão = control123, mustChangePassword=true (trocam no 1º login).
 *
 * USO:
 *   node scripts/add-tech-collaborators.mjs --dry-run   # só mostra o que faria
 *   node scripts/add-tech-collaborators.mjs --execute   # executa contra o banco
 *
 * Requer DATABASE_URL no ambiente.
 */

import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";

const DRY_RUN = !process.argv.includes("--execute");
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("Missing DATABASE_URL"); process.exit(1); }
const sql = neon(dbUrl);

const TEMP_PASSWORD = "control123";

const PEOPLE = [
  { name: "Bruno Ferro", email: "bruno.ferro@betteredu.com.br" },
  { name: "Felipe Marcelino", email: "felipe.marcelino@betteredu.com.br" },
  { name: "Danilo Paiva", email: "danilo.paiva@betteredu.com.br" },
];

async function main() {
  const [tech] = await sql`SELECT id, name FROM areas WHERE slug = 'tech' LIMIT 1`;
  if (!tech) { console.error("Área 'tech' não encontrada."); process.exit(1); }
  console.log(`Área Tech: ${tech.name} (${tech.id})`);
  console.log(DRY_RUN ? "\n— DRY RUN (nada será gravado) —\n" : "\n— EXECUTANDO —\n");

  const pwHash = await hash(TEMP_PASSWORD, 12);

  for (const p of PEOPLE) {
    const email = p.email.trim().toLowerCase();
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing) {
      console.log(`⏭️  ${p.name} <${email}> já existe (id ${existing.id}) — pulando.`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`➕ criaria ${p.name} <${email}> · role=member · area=tech · mustChangePassword=true`);
      continue;
    }
    const [u] = await sql`
      INSERT INTO users (name, email, password_hash, role, area_id, status, must_change_password)
      VALUES (${p.name}, ${email}, ${pwHash}, 'member', ${tech.id}, 'active', true)
      RETURNING id`;
    await sql`INSERT INTO user_areas (user_id, area_id) VALUES (${u.id}, ${tech.id})
              ON CONFLICT DO NOTHING`;
    console.log(`✅ ${p.name} <${email}> criado (id ${u.id}) na Tech.`);
  }
  console.log("\nFeito." + (DRY_RUN ? " (dry-run)" : ""));
}

main().catch((e) => { console.error(e); process.exit(1); });
