import "server-only";

import { prismaAdmin, withTenant } from "@/lib/db";

export class CustomerCreateError extends Error {
  constructor(
    message: string,
    public code: "EMAIL_TAKEN_OTHER_NAME" | "VALIDATION" | "UNKNOWN",
  ) {
    super(message);
    this.name = "CustomerCreateError";
  }
}

export type CreateCustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null; // 'YYYY-MM-DD'
};

export type CreateCustomerResult = {
  userId: string;
  created: boolean; // true=novo user, false=linkou user existente
};

/**
 * Cadastra cliente manual avulso. Upsert por email (User eh global,
 * compartilhado entre orgs). Se email vazio, gera placeholder unico
 * — pra suportar barbearia onde maioria nao tem email.
 *
 * Cria CustomerOrg link com source='manual'. Idempotente: chamar de
 * novo com o mesmo email so atualiza dados.
 */
export async function createCustomer(
  organizationId: string,
  input: CreateCustomerInput,
): Promise<CreateCustomerResult> {
  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    throw new CustomerCreateError("Nome muito curto.", "VALIDATION");
  }

  const email =
    input.email && input.email.trim().length > 0
      ? input.email.trim().toLowerCase()
      : `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@no-email.local`;

  const phone = input.phone?.trim() || null;
  const birthDate =
    input.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
      ? new Date(`${input.birthDate}T00:00:00Z`)
      : null;

  const existing = await prismaAdmin.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  let userId: string;
  let created = false;

  if (existing) {
    userId = existing.id;
    // Update apenas se o usuario nao tem dado preenchido (nao sobrescreve)
    await prismaAdmin.user.update({
      where: { id: userId },
      data: {
        ...(phone ? { phone } : {}),
        ...(birthDate ? { birthDate } : {}),
      },
    });
  } else {
    const u = await prismaAdmin.user.create({
      data: { email, name: cleanName, phone, birthDate },
      select: { id: true },
    });
    userId = u.id;
    created = true;
  }

  await withTenant(organizationId, async (db) => {
    await db.customerOrg.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, source: "manual" },
      update: {},
    });
  });

  return { userId, created };
}
