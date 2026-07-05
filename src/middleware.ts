/**
 * Edge-safe middleware: NÃO importa `@/lib/auth` (que arrasta Prisma + bcrypt).
 *
 * Duas responsabilidades:
 *
 * 1) AUTH GATE em /admin/* e /[slug]/conta/* — checa só a PRESENÇA do cookie
 *    de sessão Auth.js. Autenticação real (JWT, memberships, role) é feita
 *    em layouts admin que rodam em Node completo. Aqui só corta o caso
 *    trivial (sem cookie) sem cold-starting Prisma.
 *
 * 2) SLUG HEADER em rotas públicas /[slug]/* — extrai o slug da org no path
 *    e passa pro server via header `x-org-slug`. O root layout usa pra
 *    aplicar o tema da org no <html> ANTES do paint (pra cores cobrirem a
 *    viewport inteira, não só o subtree do segment layout).
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = [
  "authjs.session-token", // dev
  "__Secure-authjs.session-token", // prod (HTTPS)
];

// Top-level segments que NÃO são slug de org. Tudo fora dessa lista
// (e que não tem "." no nome, sinal de arquivo) é tratado como slug.
const RESERVED_TOP_SEGMENTS = new Set([
  "admin",
  "superadmin",
  "api",
  "login",
  "cadastro",
  "recuperar",
  "auth",
  "_next",
  "icons",
]);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ──── 1) AUTH GATE ────
  const isAdminPath = pathname.startsWith("/admin");
  const isSuperAdminPath = pathname.startsWith("/superadmin");
  const isCustomerAccount = /^\/[^/]+\/conta(\/|$)/.test(pathname);
  if (isAdminPath || isSuperAdminPath || isCustomerAccount) {
    const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
    if (!hasSession) {
      const next = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?next=${next}`, req.nextUrl));
    }
  }

  // Adiciona pathname como header pra layouts terem acesso. Sem isso, o
  // layout admin não sabe se a rota atual é /admin/billing (bypass do
  // billing guard) ou /admin/agenda (precisa de billing ativo).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // ──── 2) SLUG HEADER pra rotas públicas /[slug]/* ────
  const firstSegment = pathname.split("/")[1] ?? "";
  const looksLikeSlug =
    firstSegment.length > 0 &&
    !RESERVED_TOP_SEGMENTS.has(firstSegment) &&
    !firstSegment.includes(".");
  if (looksLikeSlug) {
    requestHeaders.set("x-org-slug", firstSegment);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Cobre tudo exceto assets/internals do Next + favicon.
  // Auth gate continua aplicando só nos paths específicos checados acima.
  matcher: ["/((?!_next/|favicon|manifest|sw\\.js|icons/).*)"],
};
