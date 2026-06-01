import { redirect } from "next/navigation";
import { Sofa } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listRooms } from "@/lib/server/rooms";

import { RoomCard } from "./RoomCard";
import { RoomFormDialog } from "./RoomFormDialog";

export default async function RoomsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/salas");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER.
        </p>
      </div>
    );
  }

  const rooms = await listRooms(owner.organizationId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Espaço</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Salas / Cadeiras
          </h1>
          <p className="text-sm text-subtle">
            Postos de trabalho físicos. Útil pra barbearia com várias
            cadeiras compartilhadas entre profissionais ou salão com
            ambientes separados.
          </p>
        </div>
        <RoomFormDialog mode="create" />
      </header>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Nenhuma sala cadastrada"
          description="Cadastre se quer atribuir cadeira específica a cada agendamento. Opcional."
          cta={null}
        />
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </ul>
      )}

      <p className="text-center text-[11px] text-subtle">
        <Sofa className="inline h-3 w-3" /> Bloqueio automático por sala
        no slot calculator fica pra iteração futura.
      </p>
    </div>
  );
}
