# 07 — Regras de negócio

> Fonte da verdade para QA, PM e devs. Toda PR que muda comportamento de domínio deve atualizar este doc na mesma PR.

## Glossário

| Termo | Definição |
|---|---|
| **Organização / Org** | Uma barbearia ou salão. Tenant raiz no sistema. |
| **Profissional** | Pessoa que atende clientes (barbeiro, cabeleireiro, manicure). |
| **Serviço** | Procedimento ofertado (Corte, Barba, Coloração). Tem duração fixa. |
| **Slot** | Janela de tempo disponível para agendamento. Granularidade padrão: 15 min. |
| **Agendamento (Appointment)** | Reserva confirmada de um slot por um cliente para um serviço com um profissional. |
| **Bloqueio (TimeBlock)** | Intervalo em que profissional não atende (almoço, férias, pessoal). |
| **Walk-in** | Cliente que aparece sem agendamento prévio — criado direto pelo admin. |
| **No-show** | Cliente confirmado que não compareceu. |

## RN-01 — Horário comercial

- Cada **Profissional** tem `WorkingHours` por dia da semana (`Weekday`).
- Pode haver múltiplas faixas por dia (ex: 09:00–12:00 e 14:00–18:00 com almoço entre).
- Horários em **minutos desde 00:00 local** (`startMinute`, `endMinute`), fuso da Organization (default `America/Sao_Paulo`).
- Se profissional não tem `WorkingHours` em um weekday, ele **não atende** nesse dia.

## RN-02 — Duração de serviço

- `Service.durationMinutes` é fixo. Múltiplo de **5 min** recomendado.
- `Appointment.endsAt = startsAt + service.durationMinutes` (calculado no server, não vem do client).
- Mudar a duração de um serviço **não** afeta agendamentos já existentes.

## RN-03 — Granularidade de slots

- Slots são gerados a cada **15 minutos** (configurável por org no futuro; fixo no MVP).
- Um slot é "disponível" se:
  1. Está dentro de uma faixa de `WorkingHours` do profissional naquele dia.
  2. `[slot, slot + duration]` cabe inteiro dentro da faixa (não pode estender além do fim do expediente).
  3. Não conflita com nenhum `Appointment` `CONFIRMED` do profissional.
  4. Não conflita com nenhum `TimeBlock` ativo do profissional.
  5. Respeita antecedência mínima (RN-05).

## RN-04 — Anti-conflito

- **Não pode** existir 2 `Appointment` `CONFIRMED` do mesmo profissional com intervalos `[startsAt, endsAt)` sobrepostos.
- Garantido por:
  1. Verificação em `bookingService.create()` (consulta + decisão).
  2. `EXCLUDE` constraint no Postgres com `tstzrange` + `btree_gist` (defesa em profundidade — race conditions).
- Cancelar appointment **libera** o slot imediatamente.

## RN-05 — Antecedência mínima

- Cliente final só pode agendar com **≥ 30 minutos** de antecedência (relativo a "agora" no fuso da org).
- Admin pode marcar **para qualquer momento** (até retroativo para registrar walk-in).
- Antecedência configurável por org em v2; fixo em 30 min no MVP.

## RN-06 — Janela futura

- Cliente final pode agendar até **60 dias** no futuro.
- Admin sem limite.
- Configurável por org em v2.

## RN-07 — Cancelamento

| Quem | Quando | Política |
|---|---|---|
| Cliente | ≥ 2h antes do `startsAt` | Pode cancelar livremente. `status = CANCELLED`, `cancelledAt = now()`. |
| Cliente | < 2h antes | Bloqueado no MVP — exibir mensagem "contate a barbearia". |
| Admin (OWNER/STAFF) | Qualquer momento | Pode cancelar. Razão (`cancelReason`) obrigatória se < 2h ou após `startsAt`. |
| Sistema | Após `startsAt` + 1h sem `COMPLETED` | Não cancela automaticamente; admin marca `NO_SHOW` manualmente. |

## RN-08 — No-show

- Não há detecção automática no MVP.
- Admin marca manualmente: `status = NO_SHOW`. Cliente não é penalizado no MVP (v2: limite de no-shows → bloqueia agendamentos por X dias).

## RN-09 — Conclusão

- `status = COMPLETED` marcado manualmente pelo admin/staff após atender.
- Não há flow automático (v2: marcar como completed X minutos após `endsAt`).

## RN-10 — Bloqueios (TimeBlock)

- Admin/STAFF cria `TimeBlock` para indicar indisponibilidade de profissional.
- `startsAt` < `endsAt`, ambos no futuro ou passado.
- Bloqueio se sobrepõe a um `Appointment` `CONFIRMED` existente: **fluxo rejeita**, admin precisa cancelar o appointment primeiro.

## RN-11 — Encaixe

- Admin pode criar appointment "fora dos slots" (entre dois agendamentos, durante bloqueio, fora do horário) via flag `force: true` na criação.
- Cliente final **nunca** tem essa opção.
- Encaixe ignora RN-03/04/05/06 mas **respeita RN-04 com EXCLUDE constraint do banco** — não dá pra sobrepor 2 confirmados nem com `force`.

## RN-12 — "Qualquer profissional"

- No fluxo do cliente, opção "qualquer profissional disponível":
  1. Sistema lista profissionais que fazem o serviço (via `ProfessionalService`).
  2. Para o horário escolhido, pega o primeiro disponível em ordem alfabética (determinística).
  3. v2: balanceamento por carga / preferência do cliente.

## RN-13 — Fuso horário

- `Organization.timezone` define o fuso de exibição e cálculo de slots.
- MVP fixa `America/Sao_Paulo`.
- Banco grava `timestamptz` em UTC.
- Conversão para o fuso da org só na renderização (`date-fns-tz`) e na recepção de input.
- **Mudar fuso da org não converte agendamentos existentes** (eles ficam no fuso em que foram criados — UTC no banco).

## RN-14 — Visibilidade

| Visualização | Quem vê |
|---|---|
| Vitrine pública (`/[orgSlug]`) | Qualquer pessoa (anônimo) — só serviços, profissionais (foto/bio), horários genéricos. |
| Slots disponíveis (`/[orgSlug]/agendar/horario`) | Qualquer pessoa — para escolher horário. |
| Agendamento próprio (`/conta/agendamentos`) | Cliente logado, só os próprios. |
| Agenda do dia (`(admin)/agenda`) | OWNER da org (toda) / STAFF (apenas próprios appointments). |
| Lista de clientes (`(admin)/clientes`) | OWNER apenas. |
| CRUD serviços/profissionais | OWNER apenas. |

## RN-15 — Email transacional

| Evento | Para quem | Conteúdo |
|---|---|---|
| Agendamento criado | Cliente | Confirmação com data/hora/serviço/profissional/endereço + link de cancelamento |
| Agendamento criado | Org (email do owner) | Notificação curta |
| Agendamento cancelado | Cliente | Confirmação do cancelamento |
| Cadastro de cliente | Cliente | Email de verificação (token 24h) |
| Reset de senha | Cliente | Link de reset (token 1h) |

Provider: **Resend**. From: `agendamentos@barbearia.app` (em prod).

## RN-16 — Privacidade do cliente

- Nome e telefone do cliente são `copy-on-write` no `Appointment` no momento da criação (campos `customerName`, `customerPhone`).
- Se o cliente excluir a conta (`User`), os `Appointment` permanecem com os dados copiados (`userId = NULL`). Histórico do dono não some.
- Email do cliente **não** é copiado para `Appointment` — para contatá-lo, admin usa o `User.email` se ainda existir.

## RN-17 — Onboarding de barbearia (MVP)

- **Sem self-service.** Dono entra em contato → super-admin cria `Organization` + primeiro `User` OWNER via script.
- Owner faz login, configura: serviços, profissionais, horários. Pode operar.
- v2: fluxo self-service com pagamento de assinatura.

## RN-18 — Limites por organization (MVP)

| Limite | Valor |
|---|---|
| Profissionais ativos | sem limite hard (sugerido ≤ 20 na UI) |
| Serviços ativos | sem limite hard (sugerido ≤ 50 na UI) |
| Appointments por dia | sem limite (banco aguenta) |
| Tamanho de nome (Service/Professional) | 80 chars |
| Tamanho de descrição (Service) | 500 chars |

## RN-19 — Histórico e edição

- Editar `Service` (ex: mudar preço): afeta **novos** agendamentos. Os existentes guardam o valor da época? **No MVP, não** — `Appointment` não tem snapshot de preço. v2: `Appointment.priceCentsAtBooking`.
- Editar `Professional` (renomear, mudar foto): muda a referência. Histórico mantém via `customerName` no appointment mas não nome do profissional. v2: snapshot.
- Excluir `Service` com appointments existentes: bloqueado. Use `active = false` (soft).
- Excluir `Professional` com appointments futuros: bloqueado. Cancele appointments antes.

## RN-20 — Estados de Appointment

```
        ┌──────────────┐
        │   CONFIRMED  │ ← criação
        └──────┬───────┘
               │
       ┌───────┼───────────┐
       ▼       ▼           ▼
  COMPLETED  CANCELLED   NO_SHOW
```

- Transições só "para frente" (terminal não volta a CONFIRMED).
- Em v2: estado `RESCHEDULED` que aponta para o novo `Appointment`.

## Casos de borda documentados

### RN-CB-01 — Agendamento exatamente nos limites

- Slot 09:00 com duração 30 min e fim de expediente 09:30 → **válido** (range `[)`, fecha em 09:30 mas não inclui).
- Próximo agendamento começando 09:30 → **válido** (não sobrepõe).

### RN-CB-02 — Mudança de fuso (horário de verão)

- Brasil não tem horário de verão atualmente, mas v2 deve cobrir. Documentar quando relevante.

### RN-CB-03 — Profissional desativado com appointments futuros

- `Professional.active = false` **não cancela** appointments futuros automaticamente.
- Admin é alertado e precisa decidir: realocar ou cancelar manualmente.

### RN-CB-04 — Cliente cria duas contas com mesmo email

- Bloqueado por `User.email @unique`. Mensagem amigável "Já existe conta com esse email, use 'esqueci senha'".

### RN-CB-05 — Cliente logado tenta agendar para outra pessoa

- MVP: campo `customerName` é editável no fluxo, mesmo logado. Pode marcar "no nome do meu pai".
- v2: gestão de dependentes.
