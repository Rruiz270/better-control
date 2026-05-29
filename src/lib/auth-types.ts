import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: "admin" | "head" | "member";
      areaId: string | null;
    };
  }

  interface JWT {
    id: string;
    role: "admin" | "head" | "member";
    areaId: string | null;
  }
}
