import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleInboundBotMessage, type BotOrgContext } from "@/lib/server/bot-conversation";

import { adminPrisma, createTestOrg, type TestOrgFixture } from "./setup";

/**
 * Integration do fluxo CANCELAR do bot (PBI-60 parte 1) com Postgres real.
 * Cleanup deleta só a org do teste (cascade) — nada de TRUNCATE global,
 * pra não atropelar outros arquivos de integration rodando em paralelo.
 */

describe("bot WhatsApp — fluxo CANCELAR", () => {
  let fx: TestOrgFixture;
  let org: BotOrgContext;

  beforeAll(async () => {
    fx = await createTestOrg("bot");
    org = {
      id: fx.org.id,
      name: fx.org.name,
      slug: fx.org.slug,
      timezone: "America/Sao_Paulo",
    };
  });

  afterAll(async () => {
    await adminPrisma.organization.delete({ where: { id: fx.org.id } });
    await adminPrisma.user.deleteMany({
      where: { email: `${fx.org.slug}-owner@test.local` },
    });
    await adminPrisma.$disconnect();
  });

  /** Cria appointment CONFIRMED n horas no futuro (slots distintos!). */
  async function createAppt(phone: string, hoursFromNow: number) {
    const startsAt = new Date(Date.now() + hoursFromNow * 3_600_000);
    return adminPrisma.appointment.create({
      data: {
        organizationId: fx.org.id,
        professionalId: fx.professional.id,
        serviceId: fx.service.id,
        customerName: "Cliente Bot",
        customerPhone: phone,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60_000),
        status: "CONFIRMED",
      },
      select: { id: true, startsAt: true },
    });
  }

  async function getConvo(phone: string) {
    return adminPrisma.botConversation.findFirst({
      where: { organizationId: fx.org.id, phone },
    });
  }

  it("CANCELAR com 1 agendamento pede SIM CANCELAR e cria conversa", async () => {
    const phone = "5511900000001";
    const appt = await createAppt("+55 11 90000-0001", 24);

    const reply = await handleInboundBotMessage({
      org,
      phone,
      text: "cancelar",
    });

    expect(reply).toContain("SIM CANCELAR");
    expect(reply).toContain("Corte");

    const convo = await getConvo(phone);
    expect(convo?.step).toBe("CANCEL_CONFIRM");
    expect(convo?.appointmentId).toBe(appt.id);
  });

  it("SIM CANCELAR confirma: cancela com motivo do bot e apaga a conversa", async () => {
    const phone = "5511900000001"; // continua a conversa do teste anterior

    const reply = await handleInboundBotMessage({
      org,
      phone,
      text: "sim cancelar",
    });

    expect(reply).toContain("Cancelado");

    const appt = await adminPrisma.appointment.findFirst({
      where: { organizationId: fx.org.id, customerPhone: "+55 11 90000-0001" },
    });
    expect(appt?.status).toBe("CANCELLED");
    expect(appt?.cancelReason).toContain("WhatsApp");
    expect(appt?.cancelledAt).not.toBeNull();

    expect(await getConvo(phone)).toBeNull();
  });

  it("2 agendamentos → lista numerada; o número escolhe o certo", async () => {
    const phone = "5511900000002";
    const first = await createAppt("5511900000002", 26);
    const second = await createAppt("5511900000002", 50);

    const list = await handleInboundBotMessage({
      org,
      phone,
      text: "CANCELAR",
    });
    expect(list).toContain("2 agendamentos");
    expect(list).toContain("1.");
    expect(list).toContain("2.");

    const pick = await handleInboundBotMessage({ org, phone, text: "2" });
    expect(pick).toContain("SIM CANCELAR");
    expect((await getConvo(phone))?.appointmentId).toBe(second.id);

    const done = await handleInboundBotMessage({
      org,
      phone,
      text: "SIM CANCELAR",
    });
    expect(done).toContain("Cancelado");

    const statuses = await adminPrisma.appointment.findMany({
      where: { id: { in: [first.id, second.id] } },
      select: { id: true, status: true },
    });
    expect(statuses.find((a) => a.id === second.id)?.status).toBe("CANCELLED");
    expect(statuses.find((a) => a.id === first.id)?.status).toBe("CONFIRMED");
  });

  it("texto livre sem conversa ativa fica em silêncio (não atropela humano)", async () => {
    const phone = "5511900000003";
    const reply = await handleInboundBotMessage({
      org,
      phone,
      text: "oi, tudo bem? queria saber o preço",
    });
    expect(reply).toBeNull();
    expect(await getConvo(phone)).toBeNull();
  });

  it("CANCELAR sem agendamento futuro responde que não achou", async () => {
    const reply = await handleInboundBotMessage({
      org,
      phone: "5511900000004",
      text: "cancelar",
    });
    expect(reply).toContain("Não achei agendamento");
  });

  it("SIM CANCELAR sem conversa pendente não cancela nada", async () => {
    const phone = "5511900000005";
    const appt = await createAppt("5511900000005", 30);

    const reply = await handleInboundBotMessage({
      org,
      phone,
      text: "SIM CANCELAR",
    });
    expect(reply).toContain("Não tem cancelamento pendente");

    const row = await adminPrisma.appointment.findUnique({
      where: { id: appt.id },
      select: { status: true },
    });
    expect(row?.status).toBe("CONFIRMED");
  });

  it("conversa expirada é tratada como inexistente e apagada", async () => {
    const phone = "5511900000006";
    const appt = await createAppt("5511900000006", 36);

    await handleInboundBotMessage({ org, phone, text: "cancelar" });
    await adminPrisma.botConversation.updateMany({
      where: { organizationId: fx.org.id, phone },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const reply = await handleInboundBotMessage({
      org,
      phone,
      text: "SIM CANCELAR",
    });
    expect(reply).toContain("Não tem cancelamento pendente");
    expect(await getConvo(phone)).toBeNull();

    const row = await adminPrisma.appointment.findUnique({
      where: { id: appt.id },
      select: { status: true },
    });
    expect(row?.status).toBe("CONFIRMED");
  });
});
