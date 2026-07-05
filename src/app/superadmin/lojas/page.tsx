import { OrgsTable } from "@/components/features/superadmin/OrgsTable";
import { listOrgsForSuperAdmin } from "@/lib/server/superadmin/orgs";

export const dynamic = "force-dynamic";

export default async function SuperAdminLojasPage() {
  const rows = await listOrgsForSuperAdmin({ filter: "all", limit: 200 });

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold lg:text-3xl">Gerenciamento de lojas</h1>
          <p className="mt-1 text-sm text-subtle">
            {rows.length} {rows.length === 1 ? "loja cadastrada" : "lojas cadastradas"}
          </p>
        </div>
      </header>

      <OrgsTable rows={rows} />
    </div>
  );
}
