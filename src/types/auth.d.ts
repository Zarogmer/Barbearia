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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    memberships: SessionMembership[];
  }
}

export interface SessionMembership {
  organizationId: string;
  role: MembershipRole;
  professionalId: string | null;
}
