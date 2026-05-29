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
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: FolderKanban },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/reports", label: "Relatorios", icon: BarChart3 },
  { href: "/team", label: "Equipe", icon: Users },
  { href: "/activity", label: "Atividade", icon: Activity },
  { href: "/settings", label: "Config", icon: Settings },
];

export default function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
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
