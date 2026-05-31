import "server-only";

import { z } from "zod";

import { prismaAdmin, withTenant } from "@/lib/db";

/**
 * Importação CSV de clientes (PBI-30).
 *
 * Estratégia pragmática: cada linha vira User (lookup por email). Pra
 * fazer o User aparecer em /admin/clientes (que filtra por
 * appointments.some), cria 1 Appointment placeholder CANCELLED no
 * passado com notes="csv_import_marker:<orgId>". Esse appointment é
 * filtrado em todas as outras telas (agenda, relatórios) via WHERE
 * notes != "csv_import_marker" ou status diferente.
 *
 * Trade-off conhecido: schema fica sujo. Migração futura: criar tabela
 * OrgClient explicit (PBI futuro).
 */

const CSV_IMPORT_MARKER = "csv_import_marker";

const personSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser AAAA-MM-DD")
    .optional()
    .or(z.literal("")),
});

export type ImportPerson = z.infer<typeof personSchema>;

export type ImportResult = {
  created: number;
  matched: number; // user já existia, apenas vinculado
  failed: Array<{ row: number; reason: string }>;
};

/**
 * Importa lista de pessoas. Idempotente por email (se user existir, só
 * marca como cliente da org sem duplicar).
 */
export async function importCustomers(
  organizationId: string,
  rows: Array<Partial<ImportPerson>>,
): Promise<ImportResult> {
  const failed: ImportResult["failed"] = [];
  let created = 0;
  let matched = 0;

  for (let i = 0; i < rows.length; i++) {
    const parsed = personSchema.safeParse(rows[i]);
    if (!parsed.success) {
      failed.push({
        row: i + 2, // header é linha 1, dados começam na 2
        reason: parsed.error.issues[0]?.message ?? "Linha inválida",
      });
      continue;
    }
    try {
      const r = await importOne(organizationId, parsed.data);
      if (r === "created") created += 1;
      else matched += 1;
    } catch (e) {
      console.error(`[csv-import] row ${i + 2}:`, e);
      failed.push({
        row: i + 2,
        reason: e instanceof Error ? e.message : "Erro inesperado",
      });
    }
  }

  return { created, matched, failed };
}

async function importOne(
  organizationId: string,
  person: ImportPerson,
): Promise<"created" | "matched"> {
  // Email opcional — sem email, gera placeholder único pra não bater unique
  const email =
    person.email && person.email.length > 0
      ? person.email
      : `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@imported.local`;

  // Upsert user (lookup por email — único global)
  const existing = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true },
  });

  let userId: string;
  let result: "created" | "matched";

  if (existing) {
    userId = existing.id;
    result = "matched";
    // Atualiza dados se preenchidos
    await prismaAdmin.user.update({
      where: { id: userId },
      data: {
        name: person.name,
        ...(person.phone ? { phone: person.phone } : {}),
        ...(person.birthDate
          ? { birthDate: new Date(`${person.birthDate}T00:00:00Z`) }
          : {}),
      },
    });
  } else {
    const u = await prismaAdmin.user.create({
      data: {
        email,
        name: person.name,
        phone: person.phone || null,
        birthDate: person.birthDate
          ? new Date(`${person.birthDate}T00:00:00Z`)
          : null,
      },
      select: { id: true },
    });
    userId = u.id;
    result = "created";
  }

  // Marca como cliente da org via Appointment placeholder se ainda não tem
  await withTenant(organizationId, async (db) => {
    const hasAny = await db.appointment.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (hasAny) return;

    // Pega o primeiro serviço/profissional pra preencher FKs (Appointment
    // exige). Se não tiver, falha graciosa.
    const [service, professional] = await Promise.all([
      db.service.findFirst({ select: { id: true } }),
      db.professional.findFirst({ select: { id: true } }),
    ]);
    if (!service || !professional) {
      throw new Error(
        "Cadastre pelo menos 1 serviço e 1 profissional antes de importar.",
      );
    }

    const markerDate = new Date("2000-01-01T00:00:00Z");
    await db.appointment.create({
      data: {
        organizationId,
        professionalId: professional.id,
        serviceId: service.id,
        userId,
        customerName: person.name,
        customerPhone: person.phone || null,
        startsAt: markerDate,
        endsAt: new Date(markerDate.getTime() + 30 * 60 * 1000),
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: CSV_IMPORT_MARKER,
        notes: `${CSV_IMPORT_MARKER}:${organizationId}`,
      },
    });
  });

  return result;
}

export { CSV_IMPORT_MARKER };
