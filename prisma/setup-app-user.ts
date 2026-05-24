/**
 * Cria/atualiza a role `app_user` no Postgres com a senha de APP_USER_PASSWORD
 * e dá os GRANTs necessários para a aplicação operar (com RLS forçado).
 *
 * Rode UMA VEZ após `prisma migrate deploy`, e novamente sempre que
 * adicionar tabelas novas. Idempotente.
 *
 * Uso: pnpm tsx prisma/setup-app-user.ts
 */
import { Client } from "pg";
import "dotenv/config";

const DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const APP_USER_PASSWORD = process.env.APP_USER_PASSWORD;

if (!DIRECT_URL) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}
if (!APP_USER_PASSWORD) {
  console.error("Missing APP_USER_PASSWORD in .env");
  process.exit(1);
}

async function main() {
  const c = new Client({ connectionString: DIRECT_URL });
  await c.connect();
  try {
    const exists = await c.query<{ count: string }>(
      "SELECT count(*)::text as count FROM pg_roles WHERE rolname = 'app_user'",
    );
    const roleExists = Number(exists.rows[0]?.count ?? 0) > 0;

    if (roleExists) {
      await c.query(`ALTER ROLE app_user WITH LOGIN PASSWORD '${escapePw(APP_USER_PASSWORD!)}' NOBYPASSRLS`);
      console.log("✓ app_user updated (password reset)");
    } else {
      await c.query(`CREATE ROLE app_user WITH LOGIN PASSWORD '${escapePw(APP_USER_PASSWORD!)}' NOBYPASSRLS`);
      console.log("✓ app_user created");
    }

    await c.query("GRANT USAGE ON SCHEMA public TO app_user");
    await c.query(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user",
    );
    await c.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user");
    await c.query("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user");
    await c.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user",
    );
    await c.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user",
    );
    await c.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO app_user",
    );
    console.log("✓ Privileges granted on schema public");

    const me = await c.query<{ current_user: string }>("SELECT current_user");
    console.log(`\nConnected as: ${me.rows[0]?.current_user}`);
    console.log(
      `\nNext step: update DATABASE_URL in .env to use app_user instead of postgres:`,
    );
    console.log(
      `  DATABASE_URL="postgresql://app_user:${APP_USER_PASSWORD}@${parseHost(DIRECT_URL!)}/${parseDb(DIRECT_URL!)}"`,
    );
  } finally {
    await c.end();
  }
}

function escapePw(pw: string): string {
  return pw.replace(/'/g, "''");
}

function parseHost(url: string): string {
  const m = url.match(/@([^/]+)\//);
  return m?.[1] ?? "<host>";
}

function parseDb(url: string): string {
  const m = url.match(/\/([^?]+)(\?|$)/);
  return m?.[1] ?? "<db>";
}

main().catch((e) => {
  console.error("Setup failed:", e.message);
  process.exit(1);
});
