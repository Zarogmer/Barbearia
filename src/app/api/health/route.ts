import { NextResponse } from "next/server";

import { prismaAdmin } from "@/lib/db";

/**
 * Health check endpoint. Usado por:
 * - Vercel deployments (verifica que o app subiu)
 * - Monitoring externo (uptime probes)
 * - Smoke test pós-deploy (PBI-14)
 *
 * Retorna 200 + JSON com status do app e do banco. Se o banco está
 * inacessível, retorna 503.
 *
 * Não exige autenticação intencionalmente — endpoint de infra.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    // SELECT 1 — query mais barata possível, só pra confirmar conexão.
    await prismaAdmin.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }

  const latencyMs = Date.now() - startedAt;
  const ok = dbOk;

  return NextResponse.json(
    {
      ok,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptime: process.uptime(),
      db: {
        ok: dbOk,
        latencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
