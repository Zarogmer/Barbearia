import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";

import { getOrgBySlug } from "@/lib/server/orgs";
import { listPosts } from "@/lib/server/posts";

export default async function FeedTab({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const posts = await listPosts(org.id);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Da barbearia</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Feed</h1>
        <p className="text-sm text-subtle">
          Trabalhos e novidades de {org.name}.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 text-subtle" />
          <p className="mb-2 font-display text-base font-bold">Nada por aqui ainda</p>
          <p className="text-xs text-subtle">
            A barbearia ainda não publicou nada. Volta em breve.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-md border border-line bg-surface"
            >
              <div className="aspect-square bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.caption ?? "Post"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              {p.caption && (
                <div className="p-4">
                  <p className="text-sm leading-relaxed">{p.caption}</p>
                </div>
              )}
              <div className="border-t border-line px-4 py-2 mono text-[10px] uppercase tracking-wider text-subtle">
                {p.createdAt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
