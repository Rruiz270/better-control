"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Users,
  Activity,
  Settings,
  Zap,
  PieChart,
  Receipt,
  TrendingUp,
  Briefcase,
  GraduationCap,
  FileText,
  FileCheck,
  Calculator,
  Car,
  LineChart,
  Scissors,
  Gauge,
  Rocket,
  Target,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCog,
  ScrollText,
} from "lucide-react";
import { signOut } from "next-auth/react";

// Modo GESTÃO (operação) e modo FINANCEIRO (financeiro, só quem tem acesso).
const GESTAO_NAV = [
  { href: "/cockpit", label: "Cockpit", icon: Gauge, adminOnly: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Áreas", icon: FolderKanban },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/rateio", label: "Rateio", icon: PieChart },
  { href: "/iniciativas", label: "Iniciativas", icon: Rocket },
  { href: "/metas", label: "Metas & Caixa", icon: Target, adminOnly: true },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/team", label: "Equipe", icon: Users },
  { href: "/settings/automations", label: "Automações", icon: Zap },
  { href: "/activity", label: "Atividade", icon: Activity },
  { href: "/admin/users", label: "Usuários", icon: UserCog, adminOnly: true },
  { href: "/admin/logs", label: "Logs", icon: ScrollText, adminOnly: true },
  { href: "/settings", label: "Config", icon: Settings },
];

const FINANCEIRO_NAV = [
  { href: "/financeiro/cockpit", label: "Cockpit CFO", icon: Gauge },
  { href: "/financeiro", label: "Visão Geral", icon: BarChart3 },
  { href: "/financeiro/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/financeiro/vendas", label: "Vendas", icon: Briefcase },
  { href: "/financeiro/alunos", label: "Alunos", icon: GraduationCap },
  { href: "/financeiro/notas", label: "Notas Fiscais", icon: FileText },
  { href: "/financeiro/fiscal", label: "Fiscal", icon: FileCheck },
  { href: "/financeiro/bma", label: "BMA (Folha)", icon: Users },
  { href: "/financeiro/contabilidade", label: "Contabilidade", icon: Calculator },
  { href: "/financeiro/veiculos", label: "Veículos", icon: Car },
  { href: "/financeiro/bizplan", label: "Bizplan", icon: LineChart },
  { href: "/financeiro/turnaround", label: "Turnaround", icon: Scissors },
  { href: "/financeiro/unit-economics", label: "Unit Economics", icon: Target },
  { href: "/financeiro/centro-de-custo", label: "Centro de Custo", icon: PieChart },
  { href: "/despesas", label: "Despesas & Pessoas", icon: Receipt },
];

// Rotas que pertencem ao modo financeiro.
const FINANCEIRO_PREFIXES = ["/financeiro", "/despesas"];

export default function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Todos veem o seletor Financeiro; o acesso é controlado na página (admin).
  const inFinanceiro = FINANCEIRO_PREFIXES.some((p) => pathname.startsWith(p));
  const mode: "financeiro" | "gestao" = inFinanceiro ? "financeiro" : "gestao";
  const navItems = mode === "financeiro" ? FINANCEIRO_NAV : GESTAO_NAV;

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      } gradient-dark text-white`}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight">
              Better<span className="text-cyan">Control</span>
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Seletor de modo — visível a todos; Financeiro é gated na página (admin) */}
      {!collapsed && (
        <div className="flex gap-1 mx-2 mt-3 p-1 rounded-lg bg-white/5">
          <Link
            href="/dashboard"
            className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-colors ${
              mode === "gestao" ? "bg-cyan/20 text-cyan" : "text-white/50 hover:text-white"
            }`}
          >
            Gestão
          </Link>
          <Link
            href="/financeiro"
            className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-colors ${
              mode === "financeiro" ? "bg-cyan/20 text-cyan" : "text-white/50 hover:text-white"
            }`}
          >
            Financeiro
          </Link>
        </div>
      )}

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || userRole === "admin").map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/financeiro" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-cyan/20 text-cyan"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-navy-dark">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-white/40 capitalize">{userRole}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
