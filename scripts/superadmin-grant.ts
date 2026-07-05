/**
 * PBI-55: promove um usuário existente a super-admin.
 *
 * Uso:
 *   pnpm superadmin:grant email@dominio.com
 *   pnpm superadmin:grant email@dominio.com --revoke   # volta pra false
 *
 * Requisitos:
 *   - User precisa já existir (peça pra pessoa se cadastrar via /cadastro antes).
 *   - DATABASE_URL / DIRECT_URL no .env.
 *
 * NAO ha equivalente na UI. Escalação de privilégio SÓ via terminal do
 * ambiente. Toda mudança é logada em admin_audit_log com actor=self
 * (o mesmo user, indicando auto-promoção via script).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("Uso: pnpm superadmin:grant <email> [--revoke]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });

  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    console.error("Peça pra pessoa se cadastrar via /cadastro primeiro.");
    process.exit(1);
  }

  const nextValue = !revoke;

  if (user.isSuperAdmin === nextValue) {
    console.log(
      `Nada a fazer: ${user.email} já tem isSuperAdmin=${nextValue}.`,
    );
    process.exit(0);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: nextValue },
    }),
    prisma.adminAuditLog.create({
      data: {
        actorUserId: user.id,
        action: revoke ? "superadmin.revoke" : "superadmin.grant",
        diff: {
          before: { isSuperAdmin: user.isSuperAdmin },
          after: { isSuperAdmin: nextValue },
        },
      },
    }),
  ]);

  console.log(
    `${revoke ? "Revogado" : "Concedido"}: ${user.email} agora tem isSuperAdmin=${nextValue}.`,
  );
  console.log("Deslogue e logue de novo (JWT precisa refresh).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
