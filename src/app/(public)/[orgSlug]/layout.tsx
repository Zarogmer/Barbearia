import { getOrgPublicProfile } from "@/lib/server/orgs";
import { DEFAULT_THEME, isValidTheme } from "@/lib/server/theme";
import { cn } from "@/lib/utils";

/**
 * Layout segment do tenant público (PBI-30).
 *
 * Desde a integração do middleware com header `x-org-slug`, o ROOT layout
 * já aplica `data-theme` + `.dark` no <html> pra rotas /[slug]/* — o que
 * garante que background da viewport inteira pinta com a cor da org.
 *
 * Este wrapper aqui serve como fallback (caso o header não chegue, ex:
 * SSG/ISR) e isola o subtree do segment caso futuras telas queiram
 * sobrescrever o tema localmente.
 */
export default async function OrgPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgPublicProfile(orgSlug);
  const theme =
    org?.theme && isValidTheme(org.theme) ? org.theme : DEFAULT_THEME;
  return (
    <div
      data-theme={theme}
      className={cn(
        "min-h-screen bg-surface text-ink",
        org?.darkMode && "dark",
      )}
    >
      {children}
    </div>
  );
}
