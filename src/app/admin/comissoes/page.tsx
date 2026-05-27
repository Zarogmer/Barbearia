import Link from "next/link";
import { redirect } from "next/navigation";
import { Percent } from "lucide-react";

import { CommissionCalculator } from "@/components/features/admin/CommissionCalculator";
import { CommissionRulesEditor } from "@/components/features/admin/CommissionRulesEditor";
import { auth } from "@/lib/auth";
import {
  calculateCommission,
  listCommissionPayments,
  listCommissionRules,
} from "@/lib/server/commissions";
import { listProfessionalsAdmin } from "@/lib/server/professionals";
import { listServices } from "@/lib/server/services";
import { cn, formatBRL } from "@/lib/utils";

type Tab = "regras" | "calcular" | "historico";

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: Tab;
    professionalId?: string;
    periodStart?: string;
    periodEnd?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/comissoes");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Equipe</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Comissões
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para gerenciar comissões.
        </div>
      </div>
    );
  }
  const orgId = owner.organizationId;

  const sp = await searchParams;
  const tab: Tab = sp.tab ?? "regras";

  const [professionals, services] = await Promise.all([
    listProfessionalsAdmin(orgId),
    listServices(orgId),
  ]);

  const profList = professionals.map((p) => ({ id: p.id, name: p.name }));
  const serviceList = services.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Equipe</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Comissões
        </h1>
        <p className="text-sm text-subtle">
          Defina percentuais por profissional/serviço, calcule e registre
          pagamentos.
        </p>
      </header>

      <div className="flex gap-2 rounded-lg border border-line bg-surface-2 p-1 w-fit">
        <TabLink href="/admin/comissoes?tab=regras" active={tab === "regras"}>
          Regras
        </TabLink>
        <TabLink href="/admin/comissoes?tab=calcular" active={tab === "calcular"}>
          Calcular
        </TabLink>
        <TabLink href="/admin/comissoes?tab=historico" active={tab === "historico"}>
          Histórico
        </TabLink>
      </div>

      {profList.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
          <Percent className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="mb-2 font-display text-base font-bold">
            Cadastre profissionais primeiro
          </p>
          <p className="text-xs text-subtle">
            Vá em <Link href="/admin/profissionais" className="underline">Profissionais</Link>.
          </p>
        </div>
      ) : tab === "regras" ? (
        <RulesTab orgId={orgId} professionals={profList} services={serviceList} />
      ) : tab === "calcular" ? (
        <CalculateTab
          orgId={orgId}
          professionals={profList}
          selectedProfId={sp.professionalId}
          periodStart={sp.periodStart}
          periodEnd={sp.periodEnd}
        />
      ) : (
        <HistoryTab orgId={orgId} />
      )}
    </div>
  );
}

async function RulesTab({
  orgId,
  professionals,
  services,
}: {
  orgId: string;
  professionals: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const rules = await listCommissionRules(orgId);
  return (
    <CommissionRulesEditor
      rules={rules}
      professionals={professionals}
      services={services}
    />
  );
}

async function CalculateTab({
  orgId,
  professionals,
  selectedProfId,
  periodStart,
  periodEnd,
}: {
  orgId: string;
  professionals: { id: string; name: string }[];
  selectedProfId?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const calc =
    selectedProfId && periodStart && periodEnd
      ? await calculateCommission(orgId, {
          professionalId: selectedProfId,
          periodStart,
          periodEnd,
        })
      : null;

  return (
    <CommissionCalculator
      professionals={professionals}
      selectedProfId={selectedProfId}
      periodStart={periodStart}
      periodEnd={periodEnd}
      calc={calc}
      baseUrl="/admin/comissoes"
    />
  );
}

async function HistoryTab({ orgId }: { orgId: string }) {
  const payments = await listCommissionPayments(orgId);
  if (payments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
        <Percent className="mx-auto mb-3 h-8 w-8 text-subtle" />
        <p className="mb-2 font-display text-base font-bold">
          Sem pagamentos registrados
        </p>
        <p className="text-xs text-subtle">
          Calcule e pague na aba Calcular pra começar o histórico.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="hidden border-b border-line bg-surface-2 px-4 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle md:grid md:grid-cols-[1fr_180px_140px_140px_120px] md:items-center md:gap-3">
        <div>Profissional</div>
        <div>Período</div>
        <div>Bruto</div>
        <div>Comissão</div>
        <div>Pago em</div>
      </div>
      <div className="divide-y divide-line">
        {payments.map((p) => (
          <div
            key={p.id}
            className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_180px_140px_140px_120px] md:items-center md:gap-3"
          >
            <div className="font-semibold">{p.professionalName}</div>
            <div className="mono text-xs text-subtle">
              {p.periodStart.toLocaleDateString("pt-BR")} →{" "}
              {p.periodEnd.toLocaleDateString("pt-BR")}
            </div>
            <div className="mono text-sm">{formatBRL(p.totalGrossCents)}</div>
            <div className="mono text-sm font-semibold text-brand">
              {formatBRL(p.totalCommissionCents)}
            </div>
            <div className="mono text-xs text-subtle">
              {p.paidAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              })}
            </div>
            {p.notes && (
              <div className="col-span-full text-xs text-subtle md:col-start-2">
                {p.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-surface text-ink shadow-sm" : "text-subtle hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
