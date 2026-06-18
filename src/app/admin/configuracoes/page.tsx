import Link from "next/link";
import { redirect } from "next/navigation";

import { AppointmentColorsEditor } from "@/components/features/admin/AppointmentColorsEditor";
import { OrgConfigForm } from "@/components/features/admin/OrgConfigForm";
import { ReminderTemplateEditor } from "@/components/features/admin/ReminderTemplateEditor";
import { ThemeSelector } from "@/components/features/admin/ThemeSelector";
import { auth } from "@/lib/auth";
import { getAppointmentColors } from "@/lib/server/appointment-colors";
import { prismaAdmin } from "@/lib/db";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import { getThemeState } from "@/lib/server/theme";

import { AccountSection } from "./AccountSection";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/configuracoes");

  const ownerMembership = session.user.memberships.find((m) => m.role === "OWNER");
  if (!ownerMembership) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Organização</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Configurações
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para alterar configurações.
        </div>
      </div>
    );
  }

  const [org, themeState, apptColors, userRow] = await Promise.all([
    getOrganizationForAdmin(ownerMembership.organizationId),
    getThemeState(ownerMembership.organizationId),
    getAppointmentColors(ownerMembership.organizationId),
    prismaAdmin.user.findUnique({
      where: { id: session.user.id },
      select: { deletionScheduledFor: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Organização</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Configurações
        </h1>
        <p className="text-sm text-subtle">Dados básicos da organização e aparência.</p>
      </header>

      <div className="rounded-md border border-line bg-surface p-6">
        <OrgConfigForm
          defaults={{
            name: org.name,
            slug: org.slug,
            timezone: org.timezone,
            allowGuestBooking: org.allowGuestBooking,
            coverImageUrl: org.coverImageUrl,
            tagline: org.tagline,
            address: org.address,
            instagram: org.instagram,
            whatsapp: org.whatsapp,
            businessHours: org.businessHours,
            allowMultipleSimultaneousBookings: org.allowMultipleSimultaneousBookings,
            allowOverbookEncaixe: org.allowOverbookEncaixe,
            creditCardFeeBp: org.creditCardFeeBp,
            debitCardFeeBp: org.debitCardFeeBp,
            loyaltyEnabled: org.loyaltyEnabled,
            loyaltyGoal: org.loyaltyGoal,
            loyaltyRewardLabel: org.loyaltyRewardLabel,
          }}
        />
      </div>

      <div className="rounded-md border border-line bg-surface p-6">
        <ThemeSelector
          initialTheme={themeState.theme}
          initialDark={themeState.dark}
          canSaveAsOrgDefault
        />
      </div>

      <div className="rounded-md border border-line bg-surface p-6">
        <AppointmentColorsEditor initial={apptColors} />
      </div>

      <div className="rounded-md border border-line bg-surface p-6">
        <ReminderTemplateEditor
          initial={org.reminderTemplate}
          orgName={org.name}
        />
      </div>

      {/* Página de Bio (PBI-32): link copiável pra compartilhar no
          Instagram bio, WhatsApp, QR code impresso, etc. */}
      <div className="rounded-md border border-line bg-surface p-6">
        <div className="mb-3">
          <div className="eyebrow mb-2">Compartilhar</div>
          <h2 className="font-display text-base font-bold">Página de Bio</h2>
          <p className="text-xs text-subtle">
            Link estilo Linktree pra colar no Instagram, WhatsApp ou imprimir
            QR code. Mostra botões de contato + CTA pra agendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="mono flex-1 truncate rounded-md border border-line bg-surface-2 px-3 py-2 text-xs">
            barbearia.app/{org.slug}/bio
          </code>
          <Link
            href={`/${org.slug}/bio`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg hover:opacity-90"
          >
            Abrir
          </Link>
        </div>
      </div>

      <AccountSection
        userName={session.user.name ?? "—"}
        userEmail={session.user.email ?? "—"}
        deletionScheduledFor={
          userRow?.deletionScheduledFor?.toISOString() ?? null
        }
      />

      <div className="text-center">
        <Link
          href="/admin/configuracoes/cloudinary-debug"
          className="text-[11px] text-subtle underline-offset-2 hover:text-brand hover:underline"
        >
          Debug Cloudinary (uploads de imagem)
        </Link>
      </div>
    </div>
  );
}
