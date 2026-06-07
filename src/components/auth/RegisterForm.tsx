"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerUser } from "@/lib/actions/users";

type Area = { id: string; name: string };

export default function RegisterForm({ areas }: { areas: Area[] }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "member" as "head" | "member", areaId: "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  function submit() {
    setErr(null);
    startTransition(async () => {
      const r = await registerUser({ name: f.name, email: f.email, phone: f.phone, password: f.password, role: f.role, areaId: f.areaId || undefined });
      if (r.ok) setDone(true); else setErr(r.error ?? "Erro ao cadastrar.");
    });
  }

  if (done) return (
    <div className="text-center">
      <div className="text-4xl mb-3">✅</div>
      <h2 className="text-lg font-bold text-navy mb-1">Cadastro enviado!</h2>
      <p className="text-sm text-gray-500 mb-4">Um administrador vai <b>aprovar seu acesso</b>. Você receberá um email de boas-vindas e poderá entrar com seu email e senha.</p>
      <Link href="/login" className="text-sm font-bold text-cyan">← Voltar ao login</Link>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Crie sua conta. Após aprovação de um admin, você poderá entrar.</p>
      <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="Email" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Telefone" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <div className="grid grid-cols-2 gap-2">
        <select value={f.role} onChange={(e) => set("role", e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm">
          <option value="member">Membro</option>
          <option value="head">Head</option>
        </select>
        <select value={f.areaId} onChange={(e) => set("areaId", e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm">
          <option value="">Área…</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <input value={f.password} onChange={(e) => set("password", e.target.value)} type="password" placeholder="Senha (mín. 6)" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <button onClick={submit} disabled={pending} className="w-full py-2.5 rounded-lg gradient-accent text-navy-dark text-sm font-bold disabled:opacity-60">{pending ? "Enviando…" : "Criar conta"}</button>
      {err && <p className="text-xs text-red-500 text-center">{err}</p>}
      <p className="text-center text-xs text-gray-400">Já tem conta? <Link href="/login" className="font-bold text-cyan">Entrar</Link></p>
    </div>
  );
}
