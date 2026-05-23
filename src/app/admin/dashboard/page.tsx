import Link from "next/link";
import { ArrowRight, CalendarDays, DollarSign, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  APPOINTMENTS,
  getProfessionalById,
  getServiceById,
} from "@/lib/mock-data";
import { formatBRL, formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const todayAppointments = APPOINTMENTS.filter((a) => a.status === "CONFIRMED");
  const estimatedRevenue = todayAppointments.reduce((acc, a) => {
    const svc = getServiceById(a.serviceId);
    return acc + (svc?.priceCents ?? 0);
  }, 0);

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Hoje, {todayLabel}</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia.</p>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Agendamentos
          </div>
          <div className="text-3xl font-bold">{todayAppointments.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">hoje</div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Receita estimada
          </div>
          <div className="text-3xl font-bold">{formatBRL(estimatedRevenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">se todos comparecerem</div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Ocupação
          </div>
          <div className="text-3xl font-bold">62%</div>
          <div className="mt-1 text-xs text-muted-foreground">mock — em PBI-09</div>
        </Card>
      </div>

      {/* Próximos agendamentos */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">Próximos agendamentos</h2>
          <Link
            href="/admin/agenda"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver agenda completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y">
          {todayAppointments.map((a) => {
            const svc = getServiceById(a.serviceId);
            const prof = getProfessionalById(a.professionalId);
            return (
              <div key={a.id} className="flex items-center gap-4 p-4">
                <div className="w-16 shrink-0 text-sm font-semibold tabular-nums">
                  {formatTime(a.startsAt)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{a.customerName}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {svc?.name} · com {prof?.name.split(" ")[0]}
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Confirmado
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
