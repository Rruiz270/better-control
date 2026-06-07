"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Save, KeyRound, Loader2, Check, X } from "lucide-react";
import { createUser, updateUser, resetUserPassword, setUserAreas, createInvite, approveUser } from "@/lib/actions/users";

type Role = "admin" | "head" | "member";
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  areaId: string | null;
  areaName: string | null;
  areaIds: string[];
  status: string;
};
type Area = { id: string; name: string };

function genPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
}

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", head: "Head", member: "Membro" };

function UserRow({ user, areas }: { user: User; areas: Area[] }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [areaSel, setAreaSel] = useState<Set<string>>(new Set(user.areaIds));
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const areasChanged = JSON.stringify([...areaSel].sort()) !== JSON.stringify([...user.areaIds].sort());
  const dirty = name !== user.name || email !== user.email || role !== user.role || areasChanged;

  function toggleArea(id: string) {
    setAreaSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function save() {
    startTransition(async () => {
      const r = await updateUser(user.id, { name, email, role });
      if (r.ok && areasChanged) await setUserAreas(user.id, [...areaSel]);
      setMsg(r.ok ? { text: "Salvo", ok: true } : { text: r.error ?? "Erro", ok: false });
      if (r.ok) router.refresh();
      setTimeout(() => setMsg(null), 2500);
    });
  }

  function resetPw() {
    const pw = genPassword();
    startTransition(async () => {
      const r = await resetUserPassword(user.id, pw);
      if (r.ok) setNewPw(pw);
      else setMsg({ text: r.error ?? "Erro", ok: false });
    });
  }

  function approve() {
    startTransition(async () => {
      const r = await approveUser(user.id);
      setMsg({ text: r.emailed ? "Aprovado + email enviado" : "Aprovado (email pendente: setar RESEND_API_KEY)", ok: true });
      router.refresh();
    });
  }

  return (
    <div className="border-t border-gray-100 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[120px] px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
          placeholder="Nome"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-[2] min-w-[180px] px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
          placeholder="email@betteredu.com.br"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="head">Head</option>
          <option value="member">Membro</option>
        </select>
        <button
          onClick={save}
          disabled={!dirty || isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg gradient-main text-white text-xs font-medium disabled:opacity-40"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
        </button>
        <button
          onClick={resetPw}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200"
          title="Gerar nova senha"
        >
          <KeyRound size={12} /> Senha
        </button>
        {user.status !== "active" && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded ${user.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{user.status === "pending" ? "PENDENTE" : "CONVIDADO"}</span>
        )}
        {user.status === "pending" && (
          <button onClick={approve} disabled={isPending} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green/15 text-green text-xs font-bold hover:bg-green/25">
            <Check size={12} /> Aprovar
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Áreas:</span>
        {areas.map((a) => (
          <label key={a.id} className={`text-xs px-2 py-1 rounded-lg border cursor-pointer ${areaSel.has(a.id) ? "bg-cyan/15 border-cyan/40 text-navy font-medium" : "border-gray-200 text-gray-500"}`}>
            <input type="checkbox" className="mr-1 align-middle" checked={areaSel.has(a.id)} onChange={() => toggleArea(a.id)} />{a.name}
          </label>
        ))}
        {role === "admin" && <span className="text-[10px] text-gray-400">(admin vê tudo)</span>}
      </div>
      {msg && (
        <p className={`text-xs flex items-center gap-1 ${msg.ok ? "text-green" : "text-red-500"}`}>
          {msg.ok ? <Check size={12} /> : <X size={12} />} {msg.text}
        </p>
      )}
      {newPw && (
        <p className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
          Nova senha de <b>{name}</b>: <b className="font-mono">{newPw}</b> — copie e compartilhe com
          segurança (não some de novo).
        </p>
      )}
    </div>
  );
}

export default function UserManagement({ users, areas }: { users: User[]; areas: Area[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: genPassword(),
    role: "member" as Role,
    areaId: "",
  });
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", role: "member" as Role });
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function invite() {
    setErr(null);
    startTransition(async () => {
      const r = await createInvite({ name: inviteForm.name, role: inviteForm.role, areaIds: [] });
      if (r.ok && r.link) {
        setInviteLink(`${location.origin}${r.link}`);
        setInviteForm({ name: "", role: "member" });
        setShowInvite(false);
        router.refresh();
      } else setErr(r.error ?? "Erro ao convidar.");
    });
  }

  function submit() {
    setErr(null);
    startTransition(async () => {
      const r = await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        areaId: form.areaId || null,
      });
      if (r.ok) {
        setCreated({ email: form.email.trim().toLowerCase(), password: form.password });
        setForm({ name: "", email: "", password: genPassword(), role: "member", areaId: "" });
        setShowAdd(false);
        router.refresh();
      } else {
        setErr(r.error ?? "Erro ao criar usuário.");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-navy">Usuários ({users.length})</h3>
          <p className="text-xs text-gray-400">Criar/editar acessos e atribuir áreas (admin).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInvite((s) => !s)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan/15 text-navy text-sm font-medium"><UserPlus size={16} /> Convidar</button>
          <button onClick={() => setShowAdd((s) => !s)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-main text-white text-sm font-medium"><UserPlus size={16} /> Novo</button>
        </div>
      </div>

      {showInvite && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 flex flex-wrap items-end gap-2">
          <input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Nome do convidado" className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg border border-gray-200 text-sm" />
          <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })} className="px-2 py-1.5 rounded-lg border border-gray-200 text-sm"><option value="member">Membro</option><option value="head">Head</option></select>
          <button onClick={invite} disabled={isPending || !inviteForm.name.trim()} className="px-3 py-1.5 rounded-lg gradient-accent text-navy-dark text-sm font-bold disabled:opacity-50">Gerar link</button>
          <p className="w-full text-[11px] text-gray-400">A pessoa abre o link, define email + senha; depois você <b>aprova</b> aqui e ela recebe boas-vindas. (As áreas você marca depois de criada.)</p>
        </div>
      )}
      {inviteLink && (
        <p className="text-xs bg-cyan/10 border border-cyan/30 rounded-lg px-3 py-2 mb-3 text-navy break-all">
          Link de convite (envie p/ a pessoa): <b className="font-mono">{inviteLink}</b>
        </p>
      )}

      {created && (
        <p className="text-xs bg-green/10 border border-green/30 rounded-lg px-3 py-2 mb-3 text-green">
          Usuário criado: <b>{created.email}</b> · senha: <b className="font-mono">{created.password}</b> —
          copie e compartilhe com segurança.
        </p>
      )}

      {showAdd && (
        <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3">
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              autoFocus
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@betteredu.com.br"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <div className="flex gap-2">
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Senha"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
              />
              <button
                onClick={() => setForm({ ...form, password: genPassword() })}
                className="px-2 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200"
              >
                Gerar
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="member">Membro</option>
                <option value="head">Head</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={form.areaId}
                onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">— sem área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={isPending}
              className="px-4 py-2 rounded-lg gradient-main text-white text-sm font-medium disabled:opacity-50"
            >
              {isPending ? "Criando..." : "Criar usuário"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="-mt-1">
        {users.map((u) => (
          <UserRow key={u.id} user={u} areas={areas} />
        ))}
      </div>
    </div>
  );
}
