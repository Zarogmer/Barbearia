import { redirect } from "next/navigation";

/**
 * /conta/agendar foi unificado com /agendar (PBI-23 — consolidação de
 * fluxos paralelos). O agendamento agora é sempre anônimo na rota
 * pública e captura nome/telefone no passo final.
 *
 * Bottom nav do /conta tem entrada "Agendar" que aponta pra cá — o
 * redirect mantém o link funcionando enquanto o picker em si vive em
 * /agendar.
 */
export default async function ContaAgendarRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) qs.set(k, v);
  const tail = qs.toString();
  redirect(`/${orgSlug}/agendar${tail ? `?${tail}` : ""}`);
}
