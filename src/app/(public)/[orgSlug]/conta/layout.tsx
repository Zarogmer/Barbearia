import { notFound, redirect } from "next/navigation";

import { CustomerBottomNav } from "@/components/features/customer/CustomerBottomNav";
import { auth } from "@/lib/auth";
import { getOrgBySlug } from "@/lib/server/orgs";

/**
 * Layout do painel do cliente logado dentro de uma barbearia (PBI-48).
 *
 * - Requer login (middleware redireciona pra /login?next=...)
 * - Carrega org via slug e devolve 404 se não existe
 * - Renderiza children dentro de um <main> mobile-first e fixa a
 *   CustomerBottomNav no rodapé (estilo app nativo)
 *
 * O matcher do middleware já cobre /[orgSlug]/conta/*. Aqui é só o
 * 2º checkpoint (auth real, não só cookie).
 */
export default async function CustomerAccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [session, org] = await Promise.all([auth(), getOrgBySlug(orgSlug)]);

  if (!org) notFound();
  if (!session?.user) {
    redirect(`/login?next=/${orgSlug}/conta/historico`);
  }

  return (
    <div className="min-h-screen bg-surface-2 pb-[88px]">
      <main className="mx-auto max-w-md px-5 py-5 sm:max-w-2xl">{children}</main>
      <CustomerBottomNav orgSlug={orgSlug} />
    </div>
  );
}
