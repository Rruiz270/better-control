"use client";

import { Bell } from "lucide-react";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <h1 className="text-lg font-bold text-navy tracking-tight">
        {title || "Better Control"}
      </h1>
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={20} className="text-gray-500" />
      </button>
    </header>
  );
}
