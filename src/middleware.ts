/**
 * Edge-safe middleware: NÃO importa `@/lib/auth` (que arrasta Prisma + bcrypt).
 *
 * Cobertura: checa apenas a PRESENÇA do cookie de sessão Auth.js — autenticação
 * real (validar JWT, carregar memberships, autorizar por role) acontece em
 * `src/app/admin/layout.tsx` que roda no runtime Node completo.
 *
 * Como middleware roda em todas as requests `/admin/*`, ele bloqueia o caso
 * trivial (sem cookie) sem cold-starting Prisma — economiza latência.
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = [
  "authjs.session-token", // dev
  "__Secure-authjs.session-token", // prod (HTTPS)
];

export default function middleware(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const next = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
