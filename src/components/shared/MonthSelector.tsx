"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MN = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function MonthSelector({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(y: number, m: number) {
    router.push(`${pathname}?y=${y}&m=${m}`);
  }

  function prev() {
    go(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  }

  function next() {
    go(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <ChevronLeft size={16} className="text-gray-500" />
      </button>
      <span className="text-sm font-bold text-navy min-w-[90px] text-center">
        {MN[month - 1]} {year}
      </span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <ChevronRight size={16} className="text-gray-500" />
      </button>
    </div>
  );
}
