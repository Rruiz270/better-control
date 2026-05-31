import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next 16 renamed the "middleware" convention to "proxy". This runs the
// edge-safe authConfig (no db/bcrypt): its `authorized` callback verifies the
// JWT with AUTH_SECRET and redirects anonymous page requests to /login — real
// cryptographic validation, replacing the old "a cookie exists" check.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Skip Next internals, static assets and ALL /api routes. API routes do their
  // own auth() + authorization checks; keeping them out avoids turning a 401
  // fetch into a 302 redirect to the HTML login page.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)",
  ],
};
