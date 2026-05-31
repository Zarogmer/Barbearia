import "server-only";

import { withTenant } from "@/lib/db";

/**
 * Aniversariantes (PBI-28).
 *
 * Cliente = User com >= 1 Appointment nessa org. Query in-app (sem
 * pg extract complexo) — orgs pequenas, custo desprezível.
 */

export type BirthdayPerson = {
  userId: string;
  name: string;
  phone: string | null;
  email: string;
  birthDate: Date; // só dia/mês importam
  daysUntil: number; // 0 = hoje, 1 = amanhã, ..., 364 = ontem foi
  age: number | null; // null se birthDate ano = 1900 (placeholder)
  lastAppointmentAt: Date | null;
};

function daysUntilBirthday(birth: Date, now: Date): number {
  const y = now.getUTCFullYear();
  let next = new Date(Date.UTC(y, birth.getUTCMonth(), birth.getUTCDate()));
  if (next.getTime() < now.getTime()) {
    next = new Date(Date.UTC(y + 1, birth.getUTCMonth(), birth.getUTCDate()));
  }
  return Math.floor((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function computeAge(birth: Date, now: Date): number | null {
  const birthYear = birth.getUTCFullYear();
  // Placeholder convention: ano 1900 = "não revelar idade"
  if (birthYear <= 1900) return null;
  let age = now.getUTCFullYear() - birthYear;
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/**
 * Lista aniversariantes no horizonte de N dias (default 30).
 * Ordenado por proximidade (hoje primeiro).
 */
export async function listUpcomingBirthdays(
  organizationId: string,
  windowDays = 30,
  now: Date = new Date(),
): Promise<BirthdayPerson[]> {
  return withTenant(organizationId, async (db) => {
    // Pega clientes da org via DISTINCT user em appointments
    const customers = await db.user.findMany({
      where: {
        birthDate: { not: null },
        appointments: { some: { organizationId } },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthDate: true,
        appointments: {
          where: { organizationId },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
      },
      take: 1000,
    });

    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    return customers
      .map((c) => {
        if (!c.birthDate) return null;
        const days = daysUntilBirthday(c.birthDate, todayUtc);
        if (days > windowDays) return null;
        return {
          userId: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          birthDate: c.birthDate,
          daysUntil: days,
          age: computeAge(c.birthDate, todayUtc),
          lastAppointmentAt: c.appointments[0]?.startsAt ?? null,
        } satisfies BirthdayPerson;
      })
      .filter((x): x is BirthdayPerson => x !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  });
}

/**
 * Atualiza birthDate de um cliente. OWNER-only no caller.
 * Date input formato YYYY-MM-DD ou null pra limpar.
 */
export async function setCustomerBirthDate(
  organizationId: string,
  userId: string,
  birthDate: Date | null,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    // Confirma que o user é cliente desta org (RLS já protege appointments,
    // mas user é global — adicionamos check explícito pra evitar editar
    // cliente de outra org).
    const isCustomer = await db.appointment.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!isCustomer) {
      throw new Error("User não é cliente desta organização.");
    }
    // User é tabela global (sem RLS); update vai usando prisma (não admin)
    // mesmo assim — withTenant não impede UPDATE numa tabela sem policy.
    await db.user.update({
      where: { id: userId },
      data: { birthDate },
    });
  });
}

/**
 * Mensagem pré-formatada de parabéns. Frontend gera link wa.me.
 */
export function buildBirthdayMessage(orgName: string, customerName: string): string {
  const firstName = customerName.split(" ")[0] ?? customerName;
  return (
    `Oi ${firstName}! 🎉 Hoje é seu aniversário e a equipe da ${orgName} ` +
    `quis te desejar muita coisa boa. Agradecemos por confiar na gente. ` +
    `Bora marcar um mimo? 💈✨`
  );
}

/**
 * Constrói link WhatsApp clicável (wa.me/<phone>?text=<msg>).
 * Phone deve estar normalizado em E.164 (+5511999998888) ou só dígitos.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
