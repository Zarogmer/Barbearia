import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BookingPickerMobile } from "@/components/features/customer/BookingPickerMobile";
import { getAvailableSlots } from "@/lib/server/booking-service";
import { getOrgBySlug } from "@/lib/server/orgs";
import { listProfessionalsForService } from "@/lib/server/professionals";
import { listActiveServices } from "@/lib/server/services-public";

const MAX_DAYS_AHEAD = 60; // RN-06

export default async function AgendarPage({
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

  const professionals = sp.serviceId
    ? await listProfessionalsForService(org.id, sp.serviceId)
    : undefined;

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-5 sm:max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href={`/${orgSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
      </header>

      <div className="mb-6">
        <div className="eyebrow mb-3">Agendamento</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Agende seu horário
        </h1>
        <p className="text-sm text-subtle">
          Em {org.name} · escolha e confirme em 3 toques.
        </p>
      </div>

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
        basePath={`/${orgSlug}/agendar`}
      />
    </main>
  );
}
