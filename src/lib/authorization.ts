import { auth } from "./auth";

export async function getSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

type User = { role: string; areaId: string | null };

export function canViewArea(user: User, areaId: string): boolean {
  if (user.role === "admin") return true;
  return user.areaId === areaId;
}

export function canEditProject(user: User, projectAreaId: string): boolean {
  if (user.role === "admin") return true;
  if (user.role === "head" && user.areaId === projectAreaId) return true;
  return false;
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin";
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}
