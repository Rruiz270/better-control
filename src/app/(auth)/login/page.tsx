import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { db } from "@/db";
import { authLog, users } from "@/db/schema";

/** Registra TODA tentativa de login (sucesso/falha) p/ o painel de auditoria. */
async function logAuth(email: string, success: boolean, reason: string) {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const [u] = email
      ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
      : [];
    await db.insert(authLog).values({ email, userId: u?.id ?? null, success, reason, ip });
  } catch { /* nunca quebrar o login por causa do log */ }
}

// Login via SERVER ACTION (signIn do servidor) — respeita o basePath do Next
// (/better-control) nativamente e funciona sob o rewrite cross-project do
// institutoi10.com.br. O signIn client (next-auth/react) montava URLs na raiz
// do domínio (404) sob o subpath.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  // Só aceita caminho relativo interno (evita open-redirect e host errado).
  const safeNext =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";

  async function authenticate(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    try {
      // redirect:false → autentica e seta o cookie sem o redirect interno do
      // NextAuth (que perde o basePath sob o rewrite). Redirecionamos à mão com
      // next/redirect, que respeita o basePath /better-control.
      await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirect: false,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        await logAuth(email, false, "credenciais inválidas");
        redirect(`/login?error=CredentialsSignin`);
      }
      throw err;
    }
    await logAuth(email, true, "ok");
    redirect(safeNext);
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Better<span className="text-cyan">Control</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-[family-name:var(--font-source-serif)]">
            Sistema de Gestão do Grupo Better
          </p>
        </div>

        <form action={authenticate} className="glass-light rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan/40 text-sm"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan/40 text-sm"
              placeholder="********"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">Email ou senha incorretos</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-lg gradient-main text-white font-semibold text-sm transition-opacity hover:opacity-90"
          >
            Entrar
          </button>

          <p className="text-center text-xs text-gray-500 pt-1">
            Não tem conta?{" "}
            <Link href="/register" className="font-bold text-cyan">Cadastre-se</Link>
            <span className="block text-gray-400 mt-1">Seu acesso é liberado após aprovação de um admin.</span>
          </p>
        </form>
      </div>
    </div>
  );
}
