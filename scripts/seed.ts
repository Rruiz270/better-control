import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../src/db/schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("Seeding Better Control...");

  const pwHash = await hash("better2026", 12);

  const [carlos, raphael, helen, bruno, gilberto, membro1, membro2, membro3, membro4] =
    await db
      .insert(schema.users)
      .values([
        { name: "Carlos", email: "carlos@betteredu.com.br", passwordHash: pwHash, role: "admin" },
        { name: "Raphael Ruiz", email: "raphael.ruiz@betteredu.com.br", passwordHash: pwHash, role: "admin" },
        { name: "Helen Mendes", email: "helen@betteredu.com.br", passwordHash: pwHash, role: "head" },
        { name: "Bruno", email: "bruno@betteredu.com.br", passwordHash: pwHash, role: "head" },
        { name: "Gilberto", email: "gilberto@betteredu.com.br", passwordHash: pwHash, role: "member" },
        { name: "Ana Silva", email: "ana@betteredu.com.br", passwordHash: pwHash, role: "member" },
        { name: "Lucas Oliveira", email: "lucas@betteredu.com.br", passwordHash: pwHash, role: "member" },
        { name: "Marina Costa", email: "marina@betteredu.com.br", passwordHash: pwHash, role: "member" },
        { name: "Pedro Santos", email: "pedro@betteredu.com.br", passwordHash: pwHash, role: "member" },
      ])
      .returning();

  console.log("Users created:", 9);

  const [aIdiomas, aTech, aEdtech, aI10] = await db
    .insert(schema.areas)
    .values([
      {
        name: "Better Idiomas",
        slug: "idiomas",
        description: "Ensino de idiomas B2C, B2B, B2S e B2G",
        color: "#3B82F6",
        icon: "Languages",
        headId: helen.id,
      },
      {
        name: "Better Tech",
        slug: "tech",
        description: "Desenvolvimento de tecnologia e produtos digitais",
        color: "#8B5CF6",
        icon: "Code",
        headId: bruno.id,
      },
      {
        name: "Better EdTech",
        slug: "edtech",
        description: "Tecnologia educacional e plataformas de ensino",
        color: "#F59E0B",
        icon: "GraduationCap",
        headId: null,
      },
      {
        name: "Instituto i10",
        slug: "i10",
        description: "ICT de educacao integral e inovacao pedagogica",
        color: "#00B4D8",
        icon: "Building2",
        headId: null,
      },
    ])
    .returning();

  console.log("Areas created:", 4);

  await db
    .update(schema.users)
    .set({ areaId: aIdiomas.id })
    .where(inArray(schema.users.id, [helen.id, gilberto.id, membro1.id]));
  await db
    .update(schema.users)
    .set({ areaId: aTech.id })
    .where(inArray(schema.users.id, [bruno.id, membro2.id]));
  await db
    .update(schema.users)
    .set({ areaId: aI10.id })
    .where(inArray(schema.users.id, [membro3.id, membro4.id]));

  const projectsData = [
    // Idiomas B2C
    { areaId: aIdiomas.id, name: "Community", slug: "community", description: "Aulas em grupo community", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Community Flow", slug: "community-flow", description: "Community com fluxo flexivel", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Private", slug: "private", description: "Aulas particulares", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Private Black", slug: "private-black", description: "Aulas particulares premium", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Espanhol", slug: "espanhol", description: "Curso de espanhol", status: "planejamento" as const },
    // Idiomas B2B / B2S / B2G
    { areaId: aIdiomas.id, name: "Empresas RH", slug: "empresas-rh", description: "Idiomas para empresas via RH", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Contraturno FAAP", slug: "contraturno-faap", description: "Programa de contraturno FAAP", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Contraturno Palmares", slug: "contraturno-palmares", description: "Contraturno municipio Palmares", status: "em_execucao" as const },
    { areaId: aIdiomas.id, name: "Municipio Bilingue", slug: "municipio-bilingue-idiomas", description: "Projeto municipio bilingue", status: "planejamento" as const },
    { areaId: aIdiomas.id, name: "Ensino Integral FUNDEB", slug: "integral-fundeb-idiomas", description: "Ensino integral via FUNDEB", status: "planejamento" as const },
    // Tech
    { areaId: aTech.id, name: "Santa Catarina", slug: "santa-catarina", description: "Projeto educacional de SC", status: "em_execucao" as const },
    { areaId: aTech.id, name: "Portal do Aluno", slug: "portal-aluno", description: "Plataforma de acesso do aluno", status: "em_execucao" as const },
    { areaId: aTech.id, name: "Projeto Financeiro", slug: "projeto-financeiro", description: "Sistema financeiro interno", status: "em_execucao" as const },
    { areaId: aTech.id, name: "Gestao de Poker", slug: "poker", description: "App de gestao de poker", status: "descontinuado" as const },
    // Instituto i10
    { areaId: aI10.id, name: "Santa Catarina", slug: "sc-i10", description: "Encomenda tecnologica SC", status: "em_execucao" as const },
    { areaId: aI10.id, name: "FUNDEB", slug: "fundeb", description: "Captacao e gestao FUNDEB", status: "em_execucao" as const },
    { areaId: aI10.id, name: "Radar Fiscal 360", slug: "radar-360", description: "Dashboard fiscal municipios SP", status: "em_execucao" as const },
    { areaId: aI10.id, name: "Ensino Integral", slug: "ensino-integral", description: "Programa de ensino integral", status: "em_execucao" as const },
    { areaId: aI10.id, name: "Municipio Bilingue", slug: "municipio-bilingue-i10", description: "Programa municipio bilingue", status: "planejamento" as const },
    { areaId: aI10.id, name: "Curso AI Universidades", slug: "curso-ai", description: "Cursos de IA para universidades", status: "planejamento" as const },
    { areaId: aI10.id, name: "CRM FUNDEB", slug: "crm-fundeb", description: "CRM para gestao de leads FUNDEB", status: "em_execucao" as const },
    { areaId: aI10.id, name: "Marketing i10", slug: "marketing-i10", description: "Marketing digital do Instituto i10", status: "em_execucao" as const },
  ];

  const createdProjects = await db
    .insert(schema.projects)
    .values(projectsData.map((p) => ({ ...p, createdBy: raphael.id })))
    .returning();

  console.log("Projects created:", createdProjects.length);

  // Sample KPIs for active projects
  const kpiSamples = createdProjects
    .filter((p) => p.status === "em_execucao")
    .slice(0, 8)
    .flatMap((p) => [
      { projectId: p.id, name: "Receita Mensal", category: "financial" as const, type: "currency" as const, targetValue: "50000", currentValue: "32000", unit: "BRL", period: "2026-05" },
      { projectId: p.id, name: "Tarefas Concluidas", category: "operational" as const, type: "number" as const, targetValue: "20", currentValue: "12", unit: "tarefas" },
      { projectId: p.id, name: "Taxa de Conversao", category: "commercial" as const, type: "percentage" as const, targetValue: "15", currentValue: "9.5", unit: "%" },
    ]);

  if (kpiSamples.length > 0) {
    await db.insert(schema.kpis).values(kpiSamples);
    console.log("KPIs created:", kpiSamples.length);
  }

  // Sample tasks
  const taskSamples = createdProjects
    .filter((p) => p.status === "em_execucao")
    .slice(0, 6)
    .flatMap((p) => [
      { projectId: p.id, title: `Definir escopo do ${p.name}`, status: "concluida" as const, priority: "alta" as const, createdBy: raphael.id },
      { projectId: p.id, title: `Desenvolver MVP ${p.name}`, status: "em_andamento" as const, priority: "critica" as const, createdBy: raphael.id },
      { projectId: p.id, title: `Testes de qualidade ${p.name}`, status: "nao_iniciada" as const, priority: "media" as const, createdBy: raphael.id, dueDate: "2026-06-15" },
      { projectId: p.id, title: `Deploy producao ${p.name}`, status: "nao_iniciada" as const, priority: "media" as const, createdBy: raphael.id, dueDate: "2026-06-30" },
    ]);

  if (taskSamples.length > 0) {
    await db.insert(schema.tasks).values(taskSamples);
    console.log("Tasks created:", taskSamples.length);
  }

  console.log("Seed complete!");
}

main().catch(console.error);
