import { Image as ImageIcon } from "lucide-react";

/**
 * Placeholder do tab Feed — PBI-48 Fase 6 implementa (timeline de posts
 * da barbearia, admin faz upload).
 */
export default async function FeedTab() {
  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-3">Da barbearia</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Feed</h1>
      </header>

      <div className="rounded-md border border-dashed border-line bg-surface-2 p-10 text-center">
        <ImageIcon className="mx-auto mb-3 h-8 w-8 text-subtle" />
        <p className="mb-2 font-display text-base font-bold">Feed em breve</p>
        <p className="text-xs text-subtle">
          A barbearia poderá postar fotos e atualizações aqui.
        </p>
        <p className="mt-4 mono text-[10px] uppercase tracking-wider text-subtle">
          PBI-48 Fase 6
        </p>
      </div>
    </div>
  );
}
