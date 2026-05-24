import "server-only";
import { Prisma } from "@prisma/client";

import { prisma, withTenant } from "@/lib/db";
import type { CreateServiceInput, UpdateServiceInput } from "@/lib/validators/service";

export type ServiceWithProfessionals = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  professionalIds: string[];
};

export async function listServices(organizationId: string): Promise<ServiceWithProfessionals[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.service.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { professionalServices: { select: { professionalId: true } } },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      active: s.active,
      professionalIds: s.professionalServices.map((ps) => ps.professionalId),
    }));
  });
}

export async function getServiceById(
  organizationId: string,
  serviceId: string,
): Promise<ServiceWithProfessionals | null> {
  return withTenant(organizationId, async (db) => {
    const s = await db.service.findUnique({
      where: { id: serviceId },
      include: { professionalServices: { select: { professionalId: true } } },
    });
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      active: s.active,
      professionalIds: s.professionalServices.map((ps) => ps.professionalId),
    };
  });
}

export async function createService(
  organizationId: string,
  input: CreateServiceInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    const created = await db.service.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        priceCents: input.priceCents,
        active: input.active,
        professionalServices: input.professionalIds.length
          ? {
              create: input.professionalIds.map((professionalId) => ({ professionalId })),
            }
          : undefined,
      },
      select: { id: true },
    });
    return created;
  });
}

export async function updateService(
  organizationId: string,
  input: UpdateServiceInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.$transaction([
      db.service.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          durationMinutes: input.durationMinutes,
          priceCents: input.priceCents,
          active: input.active,
        },
      }),
      // Reset N:N — apaga todos e re-cria com os novos IDs.
      db.professionalService.deleteMany({ where: { serviceId: input.id } }),
      ...(input.professionalIds.length
        ? [
            db.professionalService.createMany({
              data: input.professionalIds.map((professionalId) => ({
                serviceId: input.id,
                professionalId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  });
}

/**
 * Não permite delete hard quando há appointments referenciando o serviço.
 * Em vez disso, marca `active = false` (soft delete). Garante histórico.
 */
export async function deactivateOrDeleteService(
  organizationId: string,
  serviceId: string,
): Promise<{ deleted: boolean }> {
  return withTenant(organizationId, async (db) => {
    const hasAppointments = await db.appointment.findFirst({
      where: { serviceId },
      select: { id: true },
    });
    if (hasAppointments) {
      await db.service.update({ where: { id: serviceId }, data: { active: false } });
      return { deleted: false };
    }
    try {
      await db.service.delete({ where: { id: serviceId } });
      return { deleted: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        // Outro FK não previsto — fallback para deactivate.
        await db.service.update({ where: { id: serviceId }, data: { active: false } });
        return { deleted: false };
      }
      throw e;
    }
  });
}

export async function listProfessionalsForPicker(
  organizationId: string,
): Promise<{ id: string; name: string; active: boolean }[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    });
  });
}

// Helper exportado pro caller saber se um erro veio do Prisma (uso em actions).
export { Prisma };
// Mantem referência ao prisma admin pra usos pontuais (não usado neste módulo
// — toda query passa por withTenant; export aqui só pra evitar lint warning
// "imported but unused" se importarmos `prisma` por engano).
export const _prisma = prisma;
