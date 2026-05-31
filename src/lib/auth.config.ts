import type { NextAuthConfig } from "next-auth";

/**
 * Paths reachable without a session. Everything else requires login.
 * Auth.js own routes (/api/auth/*) are always allowed by NextAuth.
 */
const PUBLIC_PATHS = ["/login"];

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
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
      if (isPublic) return true;
      // Returning false makes NextAuth redirect to the signIn page.
      return isLoggedIn;
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
