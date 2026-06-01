import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe slice of the auth config: NO database and NO bcrypt imports, so it
 * can run in the Middleware (edge) runtime. The credentials provider — which
 * needs Node APIs — is added only in auth.ts (Node runtime).
 *
 * This is the official NextAuth v5 split-config pattern. The `authorized`
 * callback below is what the middleware uses to validate the JWT cryptographically
 * (via AUTH_SECRET) and decide redirects — replacing the old "is any cookie
 * present?" check, which trusted an unverified value.
 */
export const authConfig = {
  trustHost: true,
  // App servido sob /better-control (basePath). As rotas internas do Auth.js
  // (/api/auth/*) e os redirects precisam carregar esse prefixo, senão o
  // signIn cai em /api/auth/* na raiz (404 no domínio do Instituto).
  basePath: "/better-control/api/auth",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // IMPORTANTE: não redirecionamos no edge. Quando o app roda sob um rewrite
    // cross-project (institutoi10.com.br/better-control), o redirect do
    // middleware perde o basePath e usa o host interno (.vercel.app) → 404/loop.
    // O gate de sessão é feito no layout (app)/layout.tsx via redirect("/login")
    // (caminho relativo, preserva basePath e host) + requireSession nas actions.
    // Mantemos o callback só para popular req.auth; sempre autoriza a passagem.
    authorized() {
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.areaId = (user as any).areaId as string | null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).role = token.role;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).areaId = token.areaId;
      return session;
    },
  },
} satisfies NextAuthConfig;
