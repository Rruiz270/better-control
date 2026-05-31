/**
 * Pure authorization policy — NO database, NO next-auth imports.
 *
 * Kept separate from authorization.ts (which is db-backed and server-only) so
 * these rules can be unit-tested in isolation and reused on the edge. The
 * predicates below are the single source of truth for "who can do what".
 */

export type Role = "admin" | "head" | "member";

export type SessionUser = {
  id: string;
  role: Role;
  areaId: string | null;
};

/** Thrown when an authenticated user lacks permission for an action. */
export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

export function canManageUsers(user: SessionUser): boolean {
  return user.role === "admin";
}

/** Read access to an area's data. */
export function canViewArea(user: SessionUser, areaId: string): boolean {
  if (user.role === "admin") return true;
  return user.areaId === areaId;
}

/**
 * Create/edit/delete the *structure* of an area (projects, KPIs, automation
 * rules): admins anywhere, heads within their own area.
 */
export function canManageArea(user: SessionUser, areaId: string): boolean {
  if (user.role === "admin") return true;
  return user.role === "head" && user.areaId === areaId;
}

/**
 * Work on tasks/notes inside an area: managers plus members assigned to that
 * area (so members stay productive without reaching into other areas).
 */
export function canContributeToArea(user: SessionUser, areaId: string): boolean {
  if (canManageArea(user, areaId)) return true;
  return user.role === "member" && user.areaId === areaId;
}
