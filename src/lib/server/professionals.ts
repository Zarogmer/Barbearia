import "server-only";

import { Prisma } from "@prisma/client";
import type { Weekday } from "@prisma/client";

import { withTenant } from "@/lib/db";
import type {
  CreateProfessionalInput,
  TimeBlockInput,
  UpdateProfessionalInput,
  WorkingHoursWindow,
} from "@/lib/validators/professional";

export type PublicProfessional = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
};

export type AdminProfessional = PublicProfessional & {
  active: boolean;
  serviceIds: string[];
};

export type AdminProfessionalDetail = AdminProfessional & {
  workingHours: WorkingHoursWindow[];
  upcomingAppointmentsCount: number;
};

/**
 * Lista profissionais ativos da org. Usado na landing pública (W-01).
 */
export async function listActiveProfessionals(
  organizationId: string,
): Promise<PublicProfessional[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}

/**
 * Lista profissionais ativos que executam um serviço específico (W-03).
 */
export async function listProfessionalsForService(
  organizationId: string,
  serviceId: string,
): Promise<PublicProfessional[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      where: {
        active: true,
        professionalServices: { some: { serviceId } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}

export async function getProfessionalById(
  organizationId: string,
  professionalId: string,
): Promise<PublicProfessional | null> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true, bio: true, photoUrl: true },
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Admin — CRUD (PBI-05)
// ──────────────────────────────────────────────────────────────

/**
 * Lista profissionais (active e inactive) para gestão admin.
 */
export async function listProfessionalsAdmin(
  organizationId: string,
): Promise<AdminProfessional[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.professional.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { professionalServices: { select: { serviceId: true } } },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      bio: p.bio,
      photoUrl: p.photoUrl,
      active: p.active,
      serviceIds: p.professionalServices.map((ps) => ps.serviceId),
    }));
  });
}

export async function getProfessionalDetail(
  organizationId: string,
  professionalId: string,
): Promise<AdminProfessionalDetail | null> {
  return withTenant(organizationId, async (db) => {
    const p = await db.professional.findUnique({
      where: { id: professionalId },
      include: {
        professionalServices: { select: { serviceId: true } },
        workingHours: {
          select: { weekday: true, startMinute: true, endMinute: true },
          orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
        },
      },
    });
    if (!p) return null;

    const upcomingCount = await db.appointment.count({
      where: {
        professionalId,
        status: "CONFIRMED",
        startsAt: { gt: new Date() },
      },
    });

    return {
      id: p.id,
      name: p.name,
      bio: p.bio,
      photoUrl: p.photoUrl,
      active: p.active,
      serviceIds: p.professionalServices.map((ps) => ps.serviceId),
      workingHours: p.workingHours.map((w) => ({
        weekday: w.weekday,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
      })),
      upcomingAppointmentsCount: upcomingCount,
    };
  });
}

export async function createProfessional(
  organizationId: string,
  input: CreateProfessionalInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    const created = await db.professional.create({
      data: {
        organizationId,
        name: input.name,
        bio: input.bio,
        photoUrl: input.photoUrl,
        active: input.active,
        professionalServices: input.serviceIds.length
          ? {
              create: input.serviceIds.map((serviceId) => ({ serviceId })),
            }
          : undefined,
      },
      select: { id: true },
    });
    return created;
  });
}

export async function updateProfessional(
  organizationId: string,
  input: UpdateProfessionalInput,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.$transaction([
      db.professional.update({
        where: { id: input.id },
        data: {
          name: input.name,
          bio: input.bio,
          photoUrl: input.photoUrl,
          active: input.active,
        },
      }),
      // Reset N:N — apaga todos e re-cria com os novos IDs.
      db.professionalService.deleteMany({ where: { professionalId: input.id } }),
      ...(input.serviceIds.length
        ? [
            db.professionalService.createMany({
              data: input.serviceIds.map((serviceId) => ({
                professionalId: input.id,
                serviceId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  });
}

export type DeactivateProfessionalResult = {
  deleted: boolean;
  futureAppointmentsCount?: number;
};

/**
 * Soft-delete (active=false) se tem appointments. Hard delete se não tem.
 * RN-CB-03: appointments futuros não são cancelados automaticamente.
 */
export async function deactivateOrDeleteProfessional(
  organizationId: string,
  professionalId: string,
): Promise<DeactivateProfessionalResult> {
  return withTenant(organizationId, async (db) => {
    const hasAny = await db.appointment.findFirst({
      where: { professionalId },
      select: { id: true },
    });
    const futureCount = await db.appointment.count({
      where: {
        professionalId,
        status: "CONFIRMED",
        startsAt: { gt: new Date() },
      },
    });
    if (hasAny) {
      await db.professional.update({
        where: { id: professionalId },
        data: { active: false },
      });
      return { deleted: false, futureAppointmentsCount: futureCount };
    }
    try {
      await db.professional.delete({ where: { id: professionalId } });
      return { deleted: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        await db.professional.update({
          where: { id: professionalId },
          data: { active: false },
        });
        return { deleted: false, futureAppointmentsCount: futureCount };
      }
      throw e;
    }
  });
}

// ──────────────────────────────────────────────────────────────
// WorkingHours — set atômico (apaga + insere em transação)
// ──────────────────────────────────────────────────────────────

export async function setWorkingHours(
  organizationId: string,
  professionalId: string,
  windows: WorkingHoursWindow[],
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.$transaction([
      db.workingHours.deleteMany({ where: { professionalId } }),
      ...(windows.length
        ? [
            db.workingHours.createMany({
              data: windows.map((w) => ({
                organizationId,
                professionalId,
                weekday: w.weekday as Weekday,
                startMinute: w.startMinute,
                endMinute: w.endMinute,
              })),
            }),
          ]
        : []),
    ]);
  });
}

// ──────────────────────────────────────────────────────────────
// TimeBlock — listar futuros / criar (rejeita conflito) / deletar
// ──────────────────────────────────────────────────────────────

export type TimeBlockRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export async function listFutureTimeBlocks(
  organizationId: string,
  professionalId: string,
): Promise<TimeBlockRow[]> {
  return withTenant(organizationId, async (db) => {
    return db.timeBlock.findMany({
      where: { professionalId, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      select: { id: true, startsAt: true, endsAt: true, reason: true },
    });
  });
}

export type TimeBlockConflictError = {
  code: "CONFLICT";
  appointmentIds: string[];
};

export async function createTimeBlock(
  organizationId: string,
  input: TimeBlockInput,
): Promise<{ id: string } | TimeBlockConflictError> {
  return withTenant(organizationId, async (db) => {
    // RN-10: rejeita se sobrepõe Appointment CONFIRMED.
    const conflicts = await db.appointment.findMany({
      where: {
        professionalId: input.professionalId,
        status: "CONFIRMED",
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      },
      select: { id: true },
    });
    if (conflicts.length > 0) {
      return { code: "CONFLICT", appointmentIds: conflicts.map((c) => c.id) };
    }
    const created = await db.timeBlock.create({
      data: {
        organizationId,
        professionalId: input.professionalId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason,
      },
      select: { id: true },
    });
    return { id: created.id };
  });
}

export async function deleteTimeBlock(
  organizationId: string,
  timeBlockId: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.timeBlock.delete({ where: { id: timeBlockId } });
  });
}

// ──────────────────────────────────────────────────────────────
// Picker — lista para selects (admin escolhe profissional)
// ──────────────────────────────────────────────────────────────

export async function listProfessionalsForServicePicker(
  organizationId: string,
): Promise<{ id: string; name: string; active: boolean }[]> {
  return withTenant(organizationId, async (db) => {
    return db.professional.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    });
  });
}

/**
 * Lista serviços (id, name) ativos para o editor de profissional.
 * Espelha listProfessionalsForPicker mas pro outro lado da relação N:N.
 */
export async function listActiveServicesForProfessionalEditor(
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  return withTenant(organizationId, async (db) => {
    return db.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  });
}
