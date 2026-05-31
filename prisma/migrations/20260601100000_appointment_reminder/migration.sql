-- Notificacoes: marca quando lembrete 24h foi disparado pra evitar
-- duplicar SMS se o cron rodar mais de uma vez.

ALTER TABLE "appointments"
  ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Index pra query do job diario: status=CONFIRMED + startsAt window
-- + reminderSentAt IS NULL.
CREATE INDEX "appointments_reminder_pending_idx"
  ON "appointments"("startsAt")
  WHERE "reminderSentAt" IS NULL AND "status" = 'CONFIRMED';
