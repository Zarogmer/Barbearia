import Link from "next/link";
import { redirect } from "next/navigation";
import { Cake, Gift, MessageCircle, Phone, User as UserIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import {
  buildBirthdayMessage,
  buildWhatsAppLink,
  listUpcomingBirthdays,
} from "@/lib/server/birthdays";
import { cn } from "@/lib/utils";

const WINDOW_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

type SearchParams = { window?: string };

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/aniversariantes");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">CRM</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Aniversariantes
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para ver aniversariantes.
        </div>
      </div>
    );
  }
  const orgId = owner.organizationId;

  const sp = await searchParams;
  const windowDays = Number(sp.window) > 0 ? Number(sp.window) : 30;

  // Promise.all — duas queries independentes (pattern guide §6)
  const [org, birthdays] = await Promise.all([
    getOrganizationForAdmin(orgId),
    listUpcomingBirthdays(orgId, windowDays),
  ]);

  const today = birthdays.filter((b) => b.daysUntil === 0);
  const thisWeek = birthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 7);
  const later = birthdays.filter((b) => b.daysUntil > 7);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">CRM</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Aniversariantes
        </h1>
        <p className="text-sm text-subtle">
          {birthdays.length === 0
            ? "Cadastre data de nascimento dos clientes em Clientes → Detalhe."
            : `${birthdays.length} aniversariante${birthdays.length !== 1 ? "s" : ""} nos próximos ${windowDays} dias.`}
        </p>
      </header>

      {/* Filtro de janela */}
      <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1 w-fit">
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w.value}
            href={`/admin/aniversariantes?window=${w.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              windowDays === w.value
                ? "bg-surface text-ink shadow-sm"
                : "text-subtle hover:text-ink",
            )}
          >
            {w.label}
          </Link>
        ))}
      </div>

      {birthdays.length === 0 ? (
        <EmptyState
          icon={<CustomersIllustration />}
          title="Ninguém faz aniversário nesse período"
          description="Adicione data de nascimento dos clientes na ficha individual pra começar a usar essa lista pra mandar mensagens de parabéns."
          cta={{ href: "/admin/clientes", label: "Ir para clientes" }}
        />
      ) : (
        <>
          {today.length > 0 && (
            <Section
              title="Hoje 🎉"
              tone="brand"
              people={today}
              orgName={org.name}
            />
          )}
          {thisWeek.length > 0 && (
            <Section
              title="Próximos 7 dias"
              tone="ok"
              people={thisWeek}
              orgName={org.name}
            />
          )}
          {later.length > 0 && (
            <Section
              title={`Daqui ${windowDays} dias`}
              tone="subtle"
              people={later}
              orgName={org.name}
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  people,
  orgName,
}: {
  title: string;
  tone: "brand" | "ok" | "subtle";
  people: Awaited<ReturnType<typeof listUpcomingBirthdays>>;
  orgName: string;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-line px-5 py-3",
          tone === "brand"
            ? "bg-brand-soft/40"
            : tone === "ok"
              ? "bg-ok/5"
              : "bg-surface-2",
        )}
      >
        <Cake
          className={cn(
            "h-4 w-4",
            tone === "brand"
              ? "text-brand"
              : tone === "ok"
                ? "text-ok"
                : "text-subtle",
          )}
        />
        <h2 className="font-display text-sm font-bold">{title}</h2>
        <span className="ml-auto mono text-[10px] uppercase tracking-wider text-subtle">
          {people.length}
        </span>
      </div>
      <div className="divide-y divide-line">
        {people.map((p) => (
          <PersonRow key={p.userId} person={p} orgName={orgName} />
        ))}
      </div>
    </section>
  );
}

function PersonRow({
  person,
  orgName,
}: {
  person: Awaited<ReturnType<typeof listUpcomingBirthdays>>[number];
  orgName: string;
}) {
  const dayMonth = person.birthDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const daysLabel =
    person.daysUntil === 0
      ? "hoje"
      : person.daysUntil === 1
        ? "amanhã"
        : `em ${person.daysUntil} dias`;

  const message = buildBirthdayMessage(orgName, person.name);
  const waLink = person.phone ? buildWhatsAppLink(person.phone, message) : null;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-5">
      <span className="avatar-ring">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-xs font-bold">
          {initials}
        </span>
      </span>
      <div className="min-w-0">
        <Link
          href={`/admin/clientes/${person.userId}`}
          className="block truncate text-sm font-semibold hover:text-brand"
        >
          {person.name}
          {person.age !== null && (
            <span className="ml-1 mono text-[10px] font-normal text-subtle">
              {daysLabel === "hoje" ? person.age + 1 : person.age + 1} anos
            </span>
          )}
        </Link>
        <div className="mono flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle">
          <span className="inline-flex items-center gap-1">
            <Gift className="h-3 w-3" />
            {dayMonth} · {daysLabel}
          </span>
          {person.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {person.phone}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {waLink ? (
          <Link
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex h-9 items-center gap-1.5 rounded-md bg-ok/10 px-3 text-xs font-semibold text-ok transition-colors hover:bg-ok/20"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Link>
        ) : (
          <span
            className="mono text-[10px] text-subtle"
            title="Cliente sem telefone cadastrado"
          >
            sem fone
          </span>
        )}
        <Link
          href={`/admin/clientes/${person.userId}`}
          className="tap inline-flex h-9 w-9 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Ver ficha do cliente"
        >
          <UserIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
