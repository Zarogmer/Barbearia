import "server-only";

import { cookies } from "next/headers";

import { withTenant } from "@/lib/db";
import { parseBusinessHours } from "@/lib/server/business-hours";

export type OnboardingStep = {
  key: "services" | "professionals" | "hours";
  label: string;
  description: string;
  done: boolean;
  href: string;
};

export type OnboardingState = {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  allDone: boolean;
  dismissed: boolean;
};

const COOKIE_DISMISSED = "onboardingDismissed";

/**
 * Avalia progresso de onboarding do dono (PBI-27). 3 passos mínimos:
 *  1. ≥1 serviço cadastrado
 *  2. ≥1 profissional cadastrado
 *  3. businessHours configurado (pelo menos 1 dia com horário)
 *
 * Cookie `onboardingDismissed=1` esconde o widget mesmo com steps pendentes.
 */
export async function getOnboardingState(
  organizationId: string,
): Promise<OnboardingState> {
  const [counts, c] = await Promise.all([
    withTenant(organizationId, async (db) => {
      const [services, professionals, org] = await Promise.all([
        db.service.count({ where: { active: true } }),
        db.professional.count({ where: { active: true } }),
        db.organization.findUnique({
          where: { id: organizationId },
          select: { businessHours: true },
        }),
      ]);
      return { services, professionals, businessHours: org?.businessHours };
    }),
    cookies(),
  ]);

  const hours = parseBusinessHours(counts.businessHours);
  const hasHours = !!hours && Object.values(hours).some((b) => !!b);

  const steps: OnboardingStep[] = [
    {
      key: "services",
      label: "Cadastrar 1 serviço",
      description: "Define o que você oferece.",
      done: counts.services >= 1,
      href: "/admin/servicos",
    },
    {
      key: "professionals",
      label: "Adicionar 1 profissional",
      description: "Quem vai atender.",
      done: counts.professionals >= 1,
      href: "/admin/profissionais",
    },
    {
      key: "hours",
      label: "Definir horário de funcionamento",
      description: "Aparece na vitrine pública.",
      done: hasHours,
      href: "/admin/configuracoes",
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    allDone: completed === steps.length,
    dismissed: c.get(COOKIE_DISMISSED)?.value === "1",
  };
}
