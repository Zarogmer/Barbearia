-- PBI-43: configs de booking por org.
-- allowMultipleSimultaneousBookings: cliente com 2 appts simultaneos
--   em profs diferentes (default false)
-- allowOverbookEncaixe: dono pode forcar agendamento em conflito
--   (default true — comportamento anterior)

ALTER TABLE "organizations"
  ADD COLUMN "allowMultipleSimultaneousBookings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowOverbookEncaixe" BOOLEAN NOT NULL DEFAULT true;
