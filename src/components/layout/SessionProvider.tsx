"use client";

import { SessionProvider as Provider } from "next-auth/react";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // basePath garante que signIn/signOut do next-auth/react chamem
  // /better-control/api/auth/* (rota real sob o basePath do app).
  return <Provider basePath="/better-control/api/auth">{children}</Provider>;
}
