import { notFound } from "next/navigation";

import { BookingPickerMobile } from "@/components/features/customer/BookingPickerMobile";
import { getAvailableSlots } from "@/lib/server/booking-service";
import { getOrgBySlug } from "@/lib/server/orgs";
import { listProfessionalsForService } from "@/lib/server/professionals";
import { listActiveServices } from "@/lib/server/services-public";

const MAX_DAYS_AHEAD = 60; // RN-06

/**
 * Tela de agendamento mobile-app (PBI-48 Fase 3).
 *
 * Single-screen com 3 cards seletores que abrem Dialogs (servico,
 * profissional, data+hora). Estado persistido em URL params pra refresh
 * funcionar e deep-link ser possivel.
 *
 * CTA "Agendar" leva pra /[orgSlug]/agendar/confirmar (fluxo legacy)
 * que ja tem ConfirmForm + Server Action createBooking.
 */
export default async function AgendarTab({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    serviceId?: string;
    professionalId?: string;
    date?: string;
    time?: string;
  }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const services = await listActiveServices(org.id);

  // Carrega professionals só se serviço já foi escolhido
  const professionals = sp.serviceId
    ? await listProfessionalsForService(org.id, sp.serviceId)
    : undefined;

  // Carrega slots só se professional + date escolhidos
  const slots =
    sp.serviceId && sp.professionalId && sp.date
      ? await getAvailableSlots({
          organizationId: org.id,
          professionalId: sp.professionalId,
          serviceId: sp.serviceId,
          date: sp.date,
        })
      : undefined;

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Agendamento</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Agende seu horário
        </h1>
        <p className="text-sm text-subtle">
          Em {org.name} · escolha e confirme em 3 toques.
        </p>
      </header>

      <BookingPickerMobile
        orgSlug={orgSlug}
        timezone={org.timezone}
        services={services}
        selected={{
          serviceId: sp.serviceId,
          professionalId: sp.professionalId,
          date: sp.date,
          time: sp.time,
        }}
        professionals={professionals}
        slots={slots}
        maxDaysAhead={MAX_DAYS_AHEAD}
      />
    </div>
  );
}
