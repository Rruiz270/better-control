# Operações — better-control

## 1. O que é

Sistema de gestão executiva do **Grupo Better**, mobile-first: projetos, tarefas (Kanban + pipeline), KPIs, financeiro (cockpit, rateio, custos manuais), notas por voz e accountability por pessoa/área, cobrindo as 4 verticais (Idiomas, Tech, EdTech, Instituto i10). Next.js 16 (App Router) + NextAuth 5 (Credentials) + Drizzle ORM sobre Neon Postgres. **Status: ativo** — commits recorrentes em 2026 (último em 2026-06-29, ajustes de financeiro/rateio e permissões multi-área).

## 2. Onde roda

- **URL de produção:** https://www.institutoi10.com.br/better-control — o app é servido sob esse subpath via rewrite no LP do institutoi10 (por isso o `basePath: "/better-control"` no `next.config.ts`).
- **URL direta (mesmo deploy):** https://better-control.vercel.app/better-control — a raiz `/` do domínio vercel.app dá 404 por causa do basePath; sempre inclua `/better-control`.
- **Projeto Vercel:** `better-control` (repo GitHub `Rruiz270/better-control`).
- **Deploy:** push em `main` → deploy automático de produção na Vercel. Não há staging.

## 3. Dados

- **Banco:** Neon Postgres (driver `@neondatabase/serverless`, HTTP), database **`neondb`** — a string de conexão é o valor de `DATABASE_URL` na Vercel (branch padrão do projeto Neon; confira no console da Neon se precisar de branch/restore).
- **Schemas:** schema `public`; tabelas definidas em `src/db/schema.ts` (Drizzle). Nomes genéricos (`users`, `projects`, `tasks`…) — o database é dedicado ao Better Control e **não deve ser compartilhado** com outros produtos.
- **Migrations:** `npm run db:generate` (gera em `./drizzle`) e `npm run db:push` (aplica). Nunca `DROP TABLE` — use `CREATE TABLE IF NOT EXISTS`. O driver neon-http não tem transações interativas; atomicidade via `db.batch([...])`.
- **Seed:** `npm run db:seed` (senha vem da env `SEED_PASSWORD`; sem ela, o script gera e imprime uma aleatória).

## 4. Env vars

Somente nomes — os valores vivem na Vercel (produção) e no `.env.local` (dev). Nunca commitar valores.

| Nome | Onde vive | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | Vercel + `.env.local` | Conexão com o Postgres da Neon (database `neondb`) |
| `AUTH_SECRET` | Vercel + `.env.local` | Assinatura das sessões JWT do NextAuth 5 |
| `CRON_SECRET` | Vercel + `.env.local` | Autoriza o endpoint do cron `sync-expenses` (Vercel envia como Bearer) |
| `SEED_PASSWORD` | `.env.local` (só para seed) | Senha inicial dos usuários criados por `npm run db:seed` |

## 5. Como rodar local

```bash
npm ci          # ou npm install
npm run dev     # Next dev (Turbopack), porta 3000
```

- **URL local:** http://localhost:3000/better-control (a raiz `/` não responde — basePath).
- Requer `.env.local` com `DATABASE_URL` e `AUTH_SECRET` (peça ao Raphael ou copie da Vercel).
- Outros comandos: `npm run build` · `npm run lint` · `npm test` (vitest — cobre `commandParser` e `policy`) · `npm run smoke`.
- Acesso a partir de outra máquina em dev: origens liberadas em `allowedDevOrigins` no `next.config.ts` (Tailscale/LAN).

## 6. Crons & automations

- **Vercel Cron:** `vercel.json` → `GET /better-control/api/cron/sync-expenses`, agenda `0 6 * * *` (06:00 UTC = 03:00 BRT, diário). Handler em `src/app/api/cron/sync-expenses/route.ts`, protegido por `CRON_SECRET`. Não dispare manualmente sem necessidade.
- **GitHub Actions:** `.github/workflows/ci.yml` — em push na `main` e em PRs roda `npm ci` → lint → test → build (o build usa envs dummy, não toca o banco).
- Sem crontab/LaunchAgents locais conhecidos para este projeto.

## 7. Diagnóstico rápido

- **Está no ar?** `curl -s -o /dev/null -w '%{http_code}' https://www.institutoi10.com.br/better-control` → 200/307 = vivo (307 redireciona para o login). Tela de login: https://www.institutoi10.com.br/better-control/login
- **Logs:** dashboard da Vercel → projeto `better-control` → Deployments/Logs (runtime e cron).
- **Erros prováveis:**
  1. **404 em tudo** — quase sempre é URL sem o prefixo `/better-control` (basePath). Confira a URL antes de suspeitar do deploy.
  2. **500 / erro de banco** — cheque `DATABASE_URL` nas envs da Vercel e o status do projeto na Neon (endpoint pode estar suspenso/limite atingido). Redeploy após corrigir a env.
  3. **Cron sync-expenses falhando (401/erro nos logs)** — `CRON_SECRET` ausente/da Vercel diferente do esperado pelo handler; ver logs do cron no dashboard e reconfigurar a env.
  4. **403 em ações de escrita** — comportamento esperado do modelo de autorização (`admin`/`head`/`member` por área, `src/lib/policy.ts`); não é bug de infra.
