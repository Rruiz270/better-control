<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Better Control

Sistema de gestão executiva do **Grupo Better**, mobile-first, cobrindo Idiomas, Tech, EdTech e Instituto i10 — projetos, tarefas (Kanban + pipeline), KPIs, notas por voz, automações e accountability por pessoa/área.

> O **`CLAUDE.md`** deste repo é a fonte de verdade para **arquitetura, modelo de autorização e cuidados de banco** (server actions, guards, `neon-http` sem transações interativas, seed). Leia-o antes de codar. Este AGENTS.md consolida setup, CI/CD e boas práticas de PR sem duplicar aquele conteúdo.

## Stack
- **Linguagem:** TypeScript (strict)
- **Framework:** Next.js 16.2 (App Router, Turbopack) + React 19
- **UI:** Tailwind CSS 4 + Framer Motion + Lucide + Recharts
- **Auth:** NextAuth 5 (beta) — Credentials + bcrypt, sessão JWT; papéis `admin | head | member`; `@auth/drizzle-adapter`
- **ORM/Banco:** Drizzle ORM + Neon PostgreSQL (driver `@neondatabase/serverless` `neon-http`)
- **Validação:** Zod 4
- **Package manager:** npm (lockfile `package-lock.json`)
- **Deploy:** Vercel (push em `main` → produção; sem staging). Cron Vercel diário (`vercel.json`)

## Comandos
- `npm run dev` — dev server (localhost:3000)
- `npm run build` — build de produção
- `npm run start` — produção
- `npm run lint` — ESLint (flat config)
- `npm test` — **Vitest** (`vitest run`); `npm run test:watch` para watch
- `npm run db:generate` / `npm run db:push` — Drizzle Kit (schema `src/db/schema.ts`)
- `npm run db:seed` — seed (`scripts/seed.ts`); senha via `SEED_PASSWORD`
- `npm run creds` — gera credenciais (`scripts/generate-credentials.ts`)
- `npm run smoke` — smoke test (`scripts/smoke.mjs`)

## Estrutura
```
src/
  app/
    (app)/ (auth)/       # grupos de rota (autenticado / login)
    api/                 # rotas de API (inclui api/cron/sync-expenses e api/voice/execute)
    register/ change-password/
  components/
  db/schema.ts           # schema Drizzle (users, projects, tasks, kpis, notes, rules…)
  lib/
    actions/             # mutations "use server" — ÚNICO ponto de autorização de escrita
    auth.ts auth.config.ts auth-types.ts
    policy.ts            # regra de autorização PURA (sem DB, testada) + policy.test.ts
    authorization.ts     # guards com DB (requireAreaAccess, requireProjectAccess…)
    voice/               # commandParser.ts (parser puro testado)
    rateio.ts (+test)  financeiroData.ts  expensesSync.ts  financialLines.constants.ts
  proxy.ts
scripts/                 # seed, generate-credentials, smoke
drizzle.config.ts        # dialect postgresql, schema src/db/schema.ts, out ./drizzle
.github/workflows/ci.yml # lint + test + build em PR e push main
```

## Convenções de código
- TS `strict`. ESLint (`eslint-config-next` 16). Ver `CLAUDE.md` para os padrões de arquitetura.
- **Toda mutation vive em `src/lib/actions/*` com `"use server"`** e passa por um **guard** de `authorization.ts` — nunca apenas `requireSession()`.
- Regra de autorização pura em `policy.ts` (testável sem DB); mantenha-a livre de DB.
- Banco: `neon-http` não tem transação interativa → use `db.batch([...])`; migrations **nunca** `DROP TABLE`, use `CREATE TABLE IF NOT EXISTS`.

## Variáveis de ambiente
`.env.local` (dev) e Environment Variables na Vercel. Nomes usados no código:
- **Obrigatórias em prod:** `DATABASE_URL` (banco/schema **dedicado** ao Better Control), `AUTH_SECRET`
- **Seed (só ao rodar seed):** `SEED_PASSWORD`
- **Cron/e-mail/integrações:** `CRON_SECRET`, `RESEND_API_KEY`, `WELCOME_FROM`, `BASE_URL`
- **Smoke test:** `SMOKE_EMAIL`, `SMOKE_PASSWORD`

Nunca commitar valores (repo público — ver seção Segurança).

## CI/CD & Deploy
- **CI:** `.github/workflows/ci.yml` roda em push `main` e em PR: `npm ci` → `npm run lint` → `npm test` → `npm run build`. O build usa `DATABASE_URL`/`AUTH_SECRET` dummy (páginas são dynamic, não conectam no banco no build).
- **Deploy:** push em `main` → Vercel (produção, sem staging). Cron Vercel diário chama `/better-control/api/cron/sync-expenses` (06h UTC).
- Mantenha o CI verde antes do merge — ele é o gate real.

## Boas práticas de PR
- Branches `feat/…`, `fix/…`, `chore/…`; Conventional Commits; PRs pequenos; ≥1 review; **squash merge**; `main` sempre deployável.
- Checklist: `npm run lint`, `npm test` e `npm run build` passam; nenhuma nova mutation sem guard; nenhum segredo no diff; migrations sem `DROP TABLE` e com rollback pensado; screenshots quando mexer em UI.

## Testes
- **Vitest** já configurado — cobre `policy.ts` (autorização), `commandParser.ts` (voz) e `rateio.ts`. Rode `npm test`.
- Ao adicionar guard/regra de autorização ou comando de voz, **adicione teste** — são as áreas mais sensíveis.
- `npm run smoke` para verificação end-to-end básica de login/fluxo.

## Segurança & dados
- **Repo público:** jamais commitar `.env`, senha real, `AUTH_SECRET` ou `DATABASE_URL`. O seed gera senha aleatória se `SEED_PASSWORD` não for setado — nunca hardcode senha.
- **LGPD:** dados de pessoas/áreas do grupo. Não inclua dados reais em seeds/fixtures; trate exports com cuidado.
- Autorização é a superfície crítica — toda escrita passa por guard. Revise dependências (`npm audit`), atenção a bumps de `next`/`next-auth` (beta).

## Gotchas
- `neon-http` **sem transações interativas** → atomicidade só via `db.batch([...])`; pré-gere ids com `crypto.randomUUID()` para referenciar entre statements.
- Migrations nunca com `DROP TABLE`.
- `DATABASE_URL` precisa apontar para banco/schema **dedicado** (nomes de tabela genéricos: `users`, `projects`, `tasks`…) — não compartilhe database com outro produto.
- NextAuth 5 é beta — comportamento pode divergir de versões estáveis.
- Next.js 16 tem breaking changes (ver banner no topo) — consulte `node_modules/next/dist/docs/` antes de codar.
