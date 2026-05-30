import "server-only";

import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db";
import type { CreateReviewInput } from "@/lib/validators/review";

export type ReviewSummary = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

export class ReviewError extends Error {
  constructor(
    message: string,
    public code: "DUPLICATE" | "NOT_OWNER" | "INVALID" | "UNKNOWN",
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/**
 * Cria review pra um appointment. Valida:
 *  - Appointment pertence à org (RLS já garante)
 *  - Appointment pertence ao userId (autor da review)
 *  - Appointment status COMPLETED (só avalia atendimento concluído)
 *  - Ainda não existe review pra esse appointment (unique no DB)
 */
export async function createReview(
  organizationId: string,
  userId: string,
  input: CreateReviewInput,
): Promise<{ id: string }> {
  return withTenant(organizationId, async (db) => {
    const appt = await db.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { userId: true, status: true },
    });
    if (!appt) throw new ReviewError("Agendamento não encontrado.", "INVALID");
    if (appt.userId !== userId) {
      throw new ReviewError("Você só pode avaliar atendimentos próprios.", "NOT_OWNER");
    }
    if (appt.status !== "COMPLETED") {
      throw new ReviewError("Só dá pra avaliar atendimento concluído.", "INVALID");
    }

    try {
      const review = await db.review.create({
        data: {
          organizationId,
          appointmentId: input.appointmentId,
          rating: input.rating,
          comment: input.comment,
        },
        select: { id: true },
      });
      return review;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ReviewError("Você já avaliou esse atendimento.", "DUPLICATE");
      }
      throw err;
    }
  });
}

export type OrgReviewSummary = {
  average: number;
  count: number;
  latest3: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    customerName: string;
  }>;
};

/**
 * Agregado das reviews de uma org pra vitrine pública (PBI-26).
 * Cacheado por 60s no caller — landing pública é rota quente.
 */
export async function getOrgReviewSummary(
  organizationId: string,
): Promise<OrgReviewSummary> {
  return withTenant(organizationId, async (db) => {
    const [aggregate, latest] = await Promise.all([
      db.review.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
      db.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          appointment: { select: { customerName: true } },
        },
      }),
    ]);
    return {
      average: aggregate._avg.rating ?? 0,
      count: aggregate._count._all,
      latest3: latest.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        customerName: r.appointment.customerName,
      })),
    };
  });
}

/**
 * Lista reviews por ID de appointment em batch. Usado pra UI mostrar
 * estrelas no histórico do cliente.
 */
export async function listReviewsByAppointmentIds(
  organizationId: string,
  appointmentIds: string[],
): Promise<Map<string, ReviewSummary>> {
  if (appointmentIds.length === 0) return new Map();
  return withTenant(organizationId, async (db) => {
    const rows = await db.review.findMany({
      where: { appointmentId: { in: appointmentIds } },
      select: {
        id: true,
        appointmentId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
    const map = new Map<string, ReviewSummary>();
    for (const r of rows) {
      map.set(r.appointmentId, {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      });
    }
    return map;
  });
}
