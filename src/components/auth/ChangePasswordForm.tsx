"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeMyPassword } from "@/lib/actions/users";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (pw.length < 6) { setErr("Mínimo 6 caracteres."); return; }
    if (pw !== pw2) { setErr("As senhas não conferem."); return; }
    setErr(null);
    start(async () => {
      const r = await changeMyPassword(pw);
      if (r.ok) router.push("/dashboard");
      else setErr(r.error ?? "Erro ao trocar a senha.");
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Por segurança, defina uma <b>nova senha</b> para sua conta (a inicial é temporária).</p>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha (mín. 6)" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirme a nova senha" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <button onClick={submit} disabled={pending} className="w-full py-2.5 rounded-lg gradient-accent text-navy-dark text-sm font-bold disabled:opacity-60">{pending ? "Salvando…" : "Definir nova senha"}</button>
      {err && <p className="text-xs text-red-500 text-center">{err}</p>}
    </div>
  );
}
