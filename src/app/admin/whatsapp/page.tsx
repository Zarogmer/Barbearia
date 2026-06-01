import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { auth } from "@/lib/auth";
import { listMessageTemplates } from "@/lib/server/messages";
import { getOrganizationForAdmin } from "@/lib/server/organizations";
import {
  getConnectionStatus,
  getEvolutionConfig,
  listChats,
} from "@/lib/server/whatsapp-api";

import { WhatsAppDashboard } from "./WhatsAppDashboard";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/whatsapp");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode gerenciar WhatsApp.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const activeTab = sp.tab ?? "conexao";

  const cfg = getEvolutionConfig();
  if (!cfg) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">CRM</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            WhatsApp
          </h1>
        </header>
        <div className="rounded-md border border-warn/30 bg-warn/5 p-5 text-sm">
          <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-warn">
            <MessageCircle className="h-4 w-4" />
            Evolution API não configurada
          </div>
          <p className="text-subtle">
            Defina <span className="mono">EVOLUTION_API_URL</span>,{" "}
            <span className="mono">EVOLUTION_API_KEY</span> e{" "}
            <span className="mono">EVOLUTION_INSTANCE</span> no .env (dev)
            ou Railway (prod). Setup detalhado em{" "}
            <span className="mono">.env.example</span>.
          </p>
          <p className="mt-2 text-subtle">
            Enquanto não configurar, OTP de agendamento e lembretes 24h
            continuam saindo via <strong>FakeWhatsAppProvider</strong> (loga
            no console em dev, crasha em prod).
          </p>
        </div>
      </div>
    );
  }

  // Carrega status + chats em paralelo. Lista vazia se desconectado.
  const [statusRes, chatsRes, templates, org] = await Promise.all([
    getConnectionStatus(),
    listChats(60),
    listMessageTemplates(owner.organizationId, { onlyActive: true }),
    getOrganizationForAdmin(owner.organizationId),
  ]);

  const initialStatus =
    statusRes.ok
      ? statusRes.data
      : { state: "unknown" as const, instanceName: cfg.instance, ownerNumber: null, ownerName: null };

  const chats = chatsRes.ok ? chatsRes.data : [];

  return (
    <WhatsAppDashboard
      activeTab={activeTab}
      initialStatus={initialStatus}
      initialChats={chats.map((c) => ({
        remoteJid: c.remoteJid,
        phone: c.phone,
        name: c.name,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: c.lastMessagePreview,
        unreadCount: c.unreadCount,
      }))}
      templates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        key: t.key,
      }))}
      orgName={org.name}
      orgAddress={org.address ?? null}
    />
  );
}
