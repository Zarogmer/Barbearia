import { redirect } from "next/navigation";

import { OrgConfigForm } from "@/components/features/admin/OrgConfigForm";
import { auth } from "@/lib/auth";
import { getOrganizationForAdmin } from "@/lib/server/organizations";

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

  const org = await getOrganizationForAdmin(ownerMembership.organizationId);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Organização</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Configurações
        </h1>
        <p className="text-sm text-subtle">Dados básicos da organização.</p>
      </header>

      <div className="rounded-md border border-line bg-surface p-6">
        <OrgConfigForm
          defaults={{
            name: org.name,
            slug: org.slug,
            timezone: org.timezone,
            allowGuestBooking: org.allowGuestBooking,
          }}
        />
      </div>
    </div>
  );
}
