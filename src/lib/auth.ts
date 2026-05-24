/**
 * NextAuth v5 — Credentials + Google (PBI-03 adiciona Google).
 *
 * Estratégia: JWT, não database sessions. Limitação da Auth.js: o Credentials
 * provider só funciona com JWT (issue v4 e v5). Database sessions ficam para
 * v2 se precisar revogar tokens em massa.
 *
 * Memberships são carregados no callback `jwt` (uma vez por login + a cada
 * 24h via maxAge do token) e copiados para `session.user.memberships`.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prismaAdmin } from "@/lib/db";
import { loginSchema } from "@/lib/validators/auth";
import type { SessionMembership } from "@/types/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // User é tabela global (sem RLS, mas a query precede o contexto tenant).
        const user = await prismaAdmin.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      if (user) token.sub = user.id as string;

      const shouldRefresh = !!user || trigger === "update" || !token.memberships;
      if (shouldRefresh && token.sub) {
        // prismaAdmin: a query é "quais orgs eu pertenço?" — sem contexto tenant
        // ainda, e o filtro por userId já isola por usuário.
        const memberships = await prismaAdmin.membership.findMany({
          where: { userId: token.sub },
          select: { organizationId: true, role: true, professionalId: true },
        });
        token.memberships = memberships satisfies SessionMembership[];
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub;
      session.user.memberships = token.memberships ?? [];
      return session;
    },
  },
});
