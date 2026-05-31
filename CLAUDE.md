@AGENTS.md

# Better Control

Sistema de gestão executiva do **Grupo Better**, mobile-first. Cobre as 4 áreas de
negócio: **Idiomas, Tech, EdTech, Instituto i10** — com projetos, tarefas (Kanban +
pipeline), KPIs, notas por voz, automações e accountability por pessoa/área.

## Stack
- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 + Framer Motion
- NextAuth 5 (Credentials + bcrypt, sessão JWT) — papéis `admin | head | member`
- Drizzle ORM + Neon PostgreSQL (driver `neon-http`)
- PWA (manifest) + voz via Web Speech API (`commandParser.ts`)

## Arquitetura
- **Mutations** vivem em `src/lib/actions/*` com `"use server"`. Componentes só
  chamam essas funções — é o ponto único onde a autorização é aplicada.
- **Voz**: `src/lib/voice/commandParser.ts` (parser puro, testado) → `POST
  /api/voice/execute` executa o comando já com checagem de permissão.

## Modelo de autorização (IMPORTANTE)
A regra pura está em `src/lib/policy.ts` (sem DB, testável). Os guards com DB estão
em `src/lib/authorization.ts`. **Toda action de escrita deve passar por um guard** —
nunca apenas `requireSession()`:
- `admin` → tudo, em qualquer área.
- `head` → cria/edita/apaga estrutura (projetos, KPIs, automações) **da sua área**.
- `member` → contribui (tarefas/notas) **dentro da sua área**; não gerencia estrutura.
- Guards: `requireAreaAccess`, `requireProjectAccess`, `requireTaskAccess`,
  `requireKpiAccess`, `requireNoteDeleteAccess`, `requireRuleAccess`. Use
  `{ contributor: true }` para liberar members em tarefas/notas.
- `AuthorizationError` → API routes mapeiam para HTTP 403.

## Banco de dados — cuidados
- Driver `neon-http` **não tem transações interativas**. Para atomicidade use
  `db.batch([...])` (uma requisição HTTP = uma transação). Pré-gere o id com
  `crypto.randomUUID()` quando precisar referenciá-lo entre statements do batch.
- Migrations: **nunca** `DROP TABLE` — use `CREATE TABLE IF NOT EXISTS`.
- Confirme que o `DATABASE_URL` aponta para um **banco/schema dedicado** do
  Better Control. O schema usa nomes genéricos (`users`, `projects`, `tasks`…) e
  não deve compartilhar database com outros produtos.

## Seed
- `npm run db:seed`. A senha vem de `SEED_PASSWORD` (env). Sem ela, o script gera
  uma senha aleatória e a imprime uma vez. **Nunca** commitar senha real (repo público).

## Deploy
- Push em `main` → deploy automático na Vercel (produção, sem staging).
- Env obrigatórias na Vercel: `DATABASE_URL`, `AUTH_SECRET` (`SEED_PASSWORD` só p/ seed).

## Comandos
- `npm run dev` · `npm run build` · `npm run lint`
- `npm test` (vitest) — cobre `commandParser` e `policy`
- `npm run db:push` / `npm run db:generate` (drizzle-kit) · `npm run db:seed`
