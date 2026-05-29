"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart3,
  User,
} from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/areas", label: "Areas", icon: FolderKanban },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Perfil", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? "text-cyan" : "text-gray-400"
              }`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
