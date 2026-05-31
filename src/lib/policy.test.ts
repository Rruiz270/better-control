import { describe, it, expect } from "vitest";
import {
  canViewArea,
  canManageArea,
  canContributeToArea,
  isAdmin,
  type SessionUser,
} from "./policy";

const AREA_A = "area-a";
const AREA_B = "area-b";

const admin: SessionUser = { id: "1", role: "admin", areaId: null };
const headA: SessionUser = { id: "2", role: "head", areaId: AREA_A };
const memberA: SessionUser = { id: "3", role: "member", areaId: AREA_A };
const memberNoArea: SessionUser = { id: "4", role: "member", areaId: null };

describe("authorization policy", () => {
  it("admin can do everything anywhere", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(canManageArea(admin, AREA_B)).toBe(true);
    expect(canContributeToArea(admin, AREA_B)).toBe(true);
    expect(canViewArea(admin, AREA_B)).toBe(true);
  });

  it("head manages only their own area", () => {
    expect(canManageArea(headA, AREA_A)).toBe(true);
    expect(canManageArea(headA, AREA_B)).toBe(false);
  });

  it("member contributes to but does not manage their area", () => {
    expect(canContributeToArea(memberA, AREA_A)).toBe(true);
    expect(canManageArea(memberA, AREA_A)).toBe(false);
  });

  it("member cannot touch other areas", () => {
    expect(canContributeToArea(memberA, AREA_B)).toBe(false);
    expect(canViewArea(memberA, AREA_B)).toBe(false);
  });

  it("member without an area is locked out of contribution", () => {
    expect(canContributeToArea(memberNoArea, AREA_A)).toBe(false);
  });
});
