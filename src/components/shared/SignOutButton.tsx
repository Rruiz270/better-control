"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOutAction()}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 transition-colors"
    >
      <LogOut size={16} />
      Sair da Conta
    </button>
  );
}
