import { getOrgPublicProfile } from "@/lib/server/orgs";
import { DEFAULT_THEME, isValidTheme } from "@/lib/server/theme";

/**
 * Layout segment do tenant público (PBI-30).
 * Aplica o tema persistido da org num wrapper, sobrescrevendo o tema do
 * root layout (que cai em cookie/default pra rotas anônimas).
 *
 * Custom properties em CSS cascadeiam por DOM ancestry, então
 * [data-theme="X"] dentro do <body> override o tema do <html>.
 *
 * Nota: o root layout já cuida do .dark no <html>. Aqui só aplicamos
 * data-theme; modo escuro de visitante anônimo continua sendo o do
 * sistema (root) — orgs que ativam dark mode no admin precisarão de
 * iteração futura pra forçar dark na vitrine pública.
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
    <div data-theme={theme} className={org?.darkMode ? "dark" : undefined}>
      {children}
    </div>
  );
}
