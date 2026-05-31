import "server-only";

import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db";
import {
  DEFAULT_APPOINTMENT_COLORS,
  parseAppointmentColors,
  type AppointmentColors,
} from "@/lib/appointment-colors";

/**
 * Lê cores customizadas da org. Fallback pros defaults se nada setado
 * (org nova ou nunca configurou).
 */
export async function getAppointmentColors(
  organizationId: string,
): Promise<AppointmentColors> {
  return withTenant(organizationId, async (db) => {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { appointmentColors: true },
    });
    return parseAppointmentColors(org?.appointmentColors);
  });
}

/** Salva cores customizadas. OWNER-only no caller. */
export async function setAppointmentColors(
  organizationId: string,
  colors: AppointmentColors | null,
): Promise<void> {
  await withTenant(organizationId, async (db) => {
    await db.organization.update({
      where: { id: organizationId },
      data: {
        appointmentColors:
          colors === null
            ? Prisma.JsonNull
            : (colors as unknown as Prisma.InputJsonValue),
      },
    });
  });
}

export { DEFAULT_APPOINTMENT_COLORS };
