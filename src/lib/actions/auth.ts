"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

// Logout via SERVER ACTION — mesma razão do login: o signOut client (next-auth/react)
// monta URLs na raiz do domínio (perde o basePath /better-control → 404). Aqui
// limpamos a sessão (redirect:false) e redirecionamos com next/redirect, que
// respeita o basePath nativamente.
export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
