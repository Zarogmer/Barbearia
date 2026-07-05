import type { MembershipRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      memberships: SessionMembership[];
      isSuperAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    memberships: SessionMembership[];
    isSuperAdmin: boolean;
  }
}

export interface SessionMembership {
  organizationId: string;
  role: MembershipRole;
  professionalId: string | null;
}
