import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

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

  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl || "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=CredentialsSignin`);
      }
      throw err; // redirects do Next são lançados como erro — re-propaga
    }
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
        </form>
      </div>
    </div>
  );
}
