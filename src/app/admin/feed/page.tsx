import { redirect } from "next/navigation";

import { DeletePostButton } from "@/components/features/admin/DeletePostButton";
import { NewPostDialog } from "@/components/features/admin/NewPostDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listPosts } from "@/lib/server/posts";

export default async function AdminFeedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/feed");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Comunicação</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Feed
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para publicar.
        </div>
      </div>
    );
  }

  const posts = await listPosts(owner.organizationId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Comunicação</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Feed
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{posts.length}</span>{" "}
            {posts.length === 1 ? "post publicado" : "posts publicados"} no app cliente.
          </p>
        </div>
        <NewPostDialog />
      </header>

      {posts.length === 0 ? (
        <EmptyState
          icon={<FeedIllustration />}
          title="Publique seu primeiro post"
          description="Cole uma URL de imagem (Instagram, CDN, qualquer host HTTPS). Aparece pra cliente no feed dele."
          cta={null}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-md border border-line bg-surface"
            >
              <div className="aspect-square bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.caption ?? "Post"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2 p-3">
                {p.caption && (
                  <p className="line-clamp-3 text-sm text-ink">{p.caption}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-[10px] uppercase tracking-wider text-subtle">
                    {p.createdAt.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <DeletePostButton postId={p.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
