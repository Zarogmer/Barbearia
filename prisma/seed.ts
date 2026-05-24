/**
 * Seed do banco: cria a org demo, 2 profissionais, 4 serviços e 1 admin.
 *
 * Usa `DIRECT_URL` (postgres, bypass RLS) porque o seed precisa criar dados
 * antes de qualquer contexto de tenant existir.
 *
 * Rode com `pnpm db:seed`. Idempotente — usa upsert pelos campos únicos.
 */
import "dotenv/config";
import { PrismaClient, MembershipRole, Weekday } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  console.log("→ Seed start (using DIRECT_URL, bypass RLS)");

  const org = await db.organization.upsert({
    where: { slug: "barbearia-demo" },
    update: {},
    create: {
      slug: "barbearia-demo",
      name: "Barbearia Demo",
      timezone: "America/Sao_Paulo",
    },
  });
  console.log("  org:", org.slug, org.id);

  const adminPasswordHash = await bcrypt.hash("senha123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@demo.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "admin@demo.com",
      name: "Admin Demo",
      passwordHash: adminPasswordHash,
      emailVerifiedAt: new Date(),
    },
  });
  console.log("  user admin:", admin.email);

  await db.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: admin.id, organizationId: org.id, role: MembershipRole.OWNER },
  });

  const services = await Promise.all([
    upsertService(org.id, "Corte", "Corte de cabelo masculino tradicional ou moderno.", 30, 5000),
    upsertService(org.id, "Barba", "Acabamento de barba com navalha e toalha quente.", 20, 3000),
    upsertService(org.id, "Combo Corte + Barba", "Corte e barba completos com desconto.", 50, 7000),
    upsertService(org.id, "Coloração", "Coloração e camuflagem de fios grisalhos.", 90, 15000),
  ]);
  console.log("  services:", services.map((s) => s.name).join(", "));

  const joao = await upsertProfessional(
    org.id,
    "João Silva",
    "10 anos de experiência. Especialista em degradê.",
  );
  const maria = await upsertProfessional(
    org.id,
    "Maria Santos",
    "Especialista em coloração e cortes femininos.",
  );
  console.log("  professionals:", joao.name, "+", maria.name);

  // João faz Corte, Barba, Combo. Maria faz tudo.
  const [corte, barba, combo, coloracao] = services;
  await Promise.all([
    linkProfessionalService(joao.id, corte!.id),
    linkProfessionalService(joao.id, barba!.id),
    linkProfessionalService(joao.id, combo!.id),
    linkProfessionalService(maria.id, corte!.id),
    linkProfessionalService(maria.id, barba!.id),
    linkProfessionalService(maria.id, combo!.id),
    linkProfessionalService(maria.id, coloracao!.id),
  ]);

  // Horários: seg-sex 09:00-19:00, sáb 09:00-17:00. 540 = 9h, 1140 = 19h, 1020 = 17h.
  const weekdays: { d: Weekday; start: number; end: number }[] = [
    { d: Weekday.MON, start: 540, end: 1140 },
    { d: Weekday.TUE, start: 540, end: 1140 },
    { d: Weekday.WED, start: 540, end: 1140 },
    { d: Weekday.THU, start: 540, end: 1140 },
    { d: Weekday.FRI, start: 540, end: 1140 },
    { d: Weekday.SAT, start: 540, end: 1020 },
  ];
  for (const prof of [joao, maria]) {
    for (const w of weekdays) {
      await db.workingHours.upsert({
        where: {
          professionalId_weekday_startMinute: {
            professionalId: prof.id,
            weekday: w.d,
            startMinute: w.start,
          },
        },
        update: { endMinute: w.end, organizationId: org.id },
        create: {
          professionalId: prof.id,
          weekday: w.d,
          startMinute: w.start,
          endMinute: w.end,
          organizationId: org.id,
        },
      });
    }
  }
  console.log("  working_hours: seg-sex 09-19, sáb 09-17 para ambos");

  console.log("\n✓ Seed concluído");
  console.log(`  Org slug: ${org.slug}`);
  console.log(`  Admin:    admin@demo.com / senha123`);
}

function upsertService(
  organizationId: string,
  name: string,
  description: string,
  durationMinutes: number,
  priceCents: number,
) {
  return db.service.upsert({
    where: { id: `00000000-0000-0000-0000-${slugToHex(name).padStart(12, "0")}` },
    update: {},
    create: {
      id: `00000000-0000-0000-0000-${slugToHex(name).padStart(12, "0")}`,
      organizationId,
      name,
      description,
      durationMinutes,
      priceCents,
    },
  });
}

function upsertProfessional(organizationId: string, name: string, bio: string) {
  return db.professional.upsert({
    where: { id: `10000000-0000-0000-0000-${slugToHex(name).padStart(12, "0")}` },
    update: { name, bio, organizationId },
    create: {
      id: `10000000-0000-0000-0000-${slugToHex(name).padStart(12, "0")}`,
      organizationId,
      name,
      bio,
    },
  });
}

async function linkProfessionalService(professionalId: string, serviceId: string) {
  await db.professionalService.upsert({
    where: { professionalId_serviceId: { professionalId, serviceId } },
    update: {},
    create: { professionalId, serviceId },
  });
}

// Generates a deterministic 12-char hex from a string (so upserts stay idempotent).
function slugToHex(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).slice(0, 12);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
