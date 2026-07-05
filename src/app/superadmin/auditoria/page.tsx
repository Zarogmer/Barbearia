import { prismaAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  "org.suspend": {
    label: "Suspendeu loja",
    cls: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
  },
  "org.reactivate": {
    label: "Reativou loja",
    cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  },
  "org.delete.schedule": {
    label: "Agendou exclusão",
    cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  },
  "org.delete.cancel": {
    label: "Cancelou exclusão",
    cls: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  },
  "superadmin.grant": {
    label: "Promoveu super-admin",
    cls: "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100",
  },
  "superadmin.revoke": {
    label: "Revogou super-admin",
    cls: "bg-gray-100 text-gray-900 dark:bg-gray-900/40 dark:text-gray-100",
  },
};

export default async function SuperAdminAuditoriaPage() {
  const entries = await prismaAdmin.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { email: true, name: true } },
      targetOrg: { select: { name: true, slug: true } },
    },
  });

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Auditoria</h1>
        <p className="mt-1 text-sm text-subtle">
          Últimas 200 ações executadas no painel super-admin. Nunca é editado — só INSERT.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left">
            <tr className="text-[10px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Loja alvo</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-subtle">
                  Nenhuma ação registrada ainda.
                </td>
              </tr>
            ) : (
              entries.map((e) => {
                const meta = ACTION_LABELS[e.action] ?? {
                  label: e.action,
                  cls: "bg-surface-3 text-subtle",
                };
                return (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-3 text-xs text-subtle">
                      {e.createdAt.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold">{e.actor.name}</div>
                      <div className="mono text-[10px] text-subtle">{e.actor.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      <div className="mono mt-1 text-[10px] text-subtle">{e.action}</div>
                    </td>
                    <td className="px-4 py-3">
                      {e.targetOrg ? (
                        <>
                          <div className="text-xs font-semibold">{e.targetOrg.name}</div>
                          <div className="mono text-[10px] text-subtle">/{e.targetOrg.slug}</div>
                        </>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="mono px-4 py-3 text-[10px] text-subtle">{e.ip ?? "—"}</td>
                    <td className="max-w-xs px-4 py-3">
                      {e.diff ? (
                        <pre className="mono max-h-24 overflow-auto rounded bg-surface-2 p-1.5 text-[10px] leading-tight text-subtle">
                          {JSON.stringify(e.diff, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
