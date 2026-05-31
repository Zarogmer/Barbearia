-- PBI-46: template customizável do lembrete WhatsApp/SMS por org.
-- Suporta placeholders {nome} {servico} {profissional} {data} {hora} {barbearia}.

ALTER TABLE "organizations"
  ADD COLUMN "reminderTemplate" TEXT;
