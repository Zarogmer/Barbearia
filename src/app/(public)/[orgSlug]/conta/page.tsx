import { redirect } from "next/navigation";

export default async function ContaIndex({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/conta/agendar`);
}
