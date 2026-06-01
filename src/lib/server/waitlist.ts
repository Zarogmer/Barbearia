import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Lista de espera (PBI-40). Cliente quer atender, nao tem slot, admin
 * adiciona aqui. Quando libera horario (cancel/no-show), admin abre
 * a tela e vê matches por serviço + janela de data + profissional
 * (opcional ANY).
 *
 * MVP: notificação é manual — admin clica em "WhatsApp" no card pra
 * abrir wa.me. v2: trigger automático ao cancelar appointment.
 */

export type WaitlistStatus = "WAITING" | "NOTIFIED" | "SCHEDULED" | "EXPIRED";

export type WaitlistRow = {
  id: string;
  customerUserId: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceId: string;
  serviceName: string;
  professionalId: string | null;
  professionalName: string | null;
  preferredDateStart: Date;
  preferredDateEnd: Date;
  status: WaitlistStatus;
  notifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  daysWaiting: number;
};

export type CreateWaitlistInput = {
  customerUserId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  serviceId: string;
  professionalId?: string | null;
  preferredDateStart: Date;
  preferredDateEnd: Date;
  notes?: string | null;
};

export async function listWaitlist(
  organizationId: string,
  opts: { status?: WaitlistStatus } = {},
): Promise<WaitlistRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.waitlist.findMany({
      where: opts.status ? { status: opts.status } : undefined,
      orderBy: [{ status: "asc" }, { preferredDateStart: "asc" }, { createdAt: "asc" }],
      include: {
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      customerUserId: r.customerUserId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      serviceId: r.serviceId,
      serviceName: r.service.name,
      professionalId: r.professionalId,
      professionalName: r.professional?.name ?? null,
      preferredDateStart: r.preferredDateStart,
      preferredDateEnd: r.preferredDateEnd,
      status: r.status,
      notifiedAt: r.notifiedAt,
      notes: r.notes,
      createdAt: r.createdAt,
      daysWaiting: Math.floor((now - r.createdAt.getTime()) / 86_400_000),
    }));
  });
}

export async function createWaitlistEntry(
  organizationId: string,
  input: CreateWaitlistInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    return db.waitlist.create({
      data: {
        organizationId,
        customerUserId: input.customerUserId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        serviceId: input.serviceId,
        professionalId: input.professionalId ?? null,
        preferredDateStart: input.preferredDateStart,
        preferredDateEnd: input.preferredDateEnd,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });
  });
}

export async function deleteWaitlistEntry(
  organizationId: string,
  id: string,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.waitlist.delete({ where: { id } });
  });
}

export async function updateWaitlistStatus(
  organizationId: string,
  id: string,
  status: WaitlistStatus,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.waitlist.update({
      where: { id },
      data: {
        status,
        notifiedAt: status === "NOTIFIED" ? new Date() : undefined,
      },
    });
  });
}

/**
 * Busca entradas que combinam com um slot livre (servico + data +
 * prof se especificado). Usado pelo admin no botao "Quem encaixa?"
 * apos cancelar appointment.
 *
 * Match = mesmo servico + janela preferida cobre a data do slot +
 * profissional bate (NULL = qualquer).
 */
export async function findWaitlistMatches(
  organizationId: string,
  args: { serviceId: string; date: Date; professionalId: string },
): Promise<WaitlistRow[]> {
  return withTenant(organizationId, async (db) => {
    const rows = await db.waitlist.findMany({
      where: {
        status: "WAITING",
        serviceId: args.serviceId,
        preferredDateStart: { lte: args.date },
        preferredDateEnd: { gte: args.date },
        OR: [
          { professionalId: null },
          { professionalId: args.professionalId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      customerUserId: r.customerUserId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      serviceId: r.serviceId,
      serviceName: r.service.name,
      professionalId: r.professionalId,
      professionalName: r.professional?.name ?? null,
      preferredDateStart: r.preferredDateStart,
      preferredDateEnd: r.preferredDateEnd,
      status: r.status,
      notifiedAt: r.notifiedAt,
      notes: r.notes,
      createdAt: r.createdAt,
      daysWaiting: Math.floor((now - r.createdAt.getTime()) / 86_400_000),
    }));
  });
}
