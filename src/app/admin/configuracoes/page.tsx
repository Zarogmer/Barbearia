import { redirect } from "next/navigation";

import { AppointmentColorsEditor } from "@/components/features/admin/AppointmentColorsEditor";
import { OrgConfigForm } from "@/components/features/admin/OrgConfigForm";
import { ReminderTemplateEditor } from "@/components/features/admin/ReminderTemplateEditor";
import { ThemeSelector } from "@/components/features/admin/ThemeSelector";
import { auth } from "@/lib/auth";
import { getAppointmentColors } from "@/lib/server/appointment-colors";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import { getThemeState } from "@/lib/server/theme";

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

  const [org, themeState, apptColors] = await Promise.all([
    getOrganizationForAdmin(ownerMembership.organizationId),
    getThemeState(ownerMembership.organizationId),
    getAppointmentColors(ownerMembership.organizationId),
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
    </div>
  );
}
