"use client";

import { useState, useTransition } from "react";
import { completeSetup } from "@/lib/actions/users";

export default function SetupForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setErr(null);
    startTransition(async () => {
      const r = await completeSetup(token, email, pw);
      if (r.ok) setDone(true); else setErr(r.error ?? "Erro.");
    });
  }

  if (done) return (
    <div className="text-center">
      <div className="text-4xl mb-3">✅</div>
      <h2 className="text-lg font-bold text-navy mb-1">Tudo certo!</h2>
      <p className="text-sm text-gray-500">Seu cadastro foi enviado. Um admin vai <b>aprovar seu acesso</b> e você receberá um email de boas-vindas. Depois é só entrar com seu email e senha.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Defina seu <b>email</b> e crie uma <b>senha</b> para acessar o Better Control.</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="senha (mín. 6)" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40" />
      <button onClick={submit} disabled={pending} className="w-full py-2.5 rounded-lg gradient-accent text-navy-dark text-sm font-bold disabled:opacity-60">{pending ? "Enviando…" : "Concluir cadastro"}</button>
      {err && <p className="text-xs text-red-500 text-center">{err}</p>}
    </div>
  );
}
