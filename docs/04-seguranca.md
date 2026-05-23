# 04 — Segurança

## Modelo de ameaças (resumo)

| Ator | O que pode tentar | Mitigação principal |
|---|---|---|
| Atacante externo (não logado) | SQL injection, XSS, brute-force login, scraping | Zod + Prisma parametrizado, CSP, rate limit, captcha em login |
| Cliente logado | Acessar dados de outra barbearia, marcar para outra pessoa | RLS + checagem de ownership em Server Actions |
| Staff de uma barbearia | Acessar dados de outra barbearia (multi-tenant leak) | **RLS no banco + tenant context em toda query** |
| Dono de barbearia | Acessar dados pessoais de cliente além do necessário | Princípio do mínimo necessário; auditoria de acesso (v2) |
| Insider (nós) | Acessar/exportar dados de tenant em prod | Conexão `app_user` com RLS, logs de queries `app_superuser` |

## Autenticação

### Stack

- **NextAuth v5** (Auth.js) com **Prisma adapter**.
- Estratégia de sessão: **database sessions** (não JWT) — permite revogação imediata.
- Cookie de sessão: `httpOnly`, `secure`, `sameSite: lax`, prefixo `__Secure-` em prod.

### Providers

1. **Credentials** (email + senha) — primário para admins e clientes.
2. **Google OAuth** — só para clientes finais (admins precisam confirmar identidade via email).

### Password hashing

- **bcrypt** com cost factor `12` (não menos).
- Migração para argon2id é v2 — bcrypt é OK para MVP.
- **Nunca** armazenar senha em log, em campo de "lembrar último input", em metadados de erro.

### Fluxos

| Fluxo | Decisão |
|---|---|
| Cadastro de cliente | email + senha + nome → `User` criado → email de verificação (Resend) → `emailVerifiedAt` setado ao clicar link |
| Cadastro de admin | só super-admin cria via seed/script no MVP — não há registro self-service |
| Login | email + senha → checa hash bcrypt → cria `Session` no banco → cookie httpOnly |
| Esqueci senha | email → token (`VerificationToken`, expira em 1h) → nova senha |
| Logout | invalida `Session` no banco + clear cookie |
| Sessão expirada | redirect para `/login?next=<path>` |

### Tempo de vida

- Cookie de sessão: **30 dias** com renovação a cada acesso (sliding window).
- Token de verificação de email: **24h**.
- Token de reset de senha: **1h**.
- Tentativas de login: **5 por IP por 15 min** (rate limit) — depois 429.

## Autorização

### Camadas

1. **Middleware** (`src/middleware.ts`): bloqueia rotas `(admin)/*` sem sessão.
2. **Layout `(admin)/layout.tsx`**: checa se `session.user` tem `Membership` ativo. Sem isso → 403.
3. **Server Action**: confere `role` se a ação exige (ex: `STAFF` não cria `Service`).
4. **RLS no banco**: última linha. Mesmo com bug, query não devolve dados de outro tenant.

### Matriz de permissões (MVP)

| Recurso | OWNER | STAFF | CLIENTE | ANÔNIMO |
|---|---|---|---|---|
| Ver agenda da org | ✅ tudo | ✅ só própria | ✅ próprios appointments | ❌ |
| Criar agendamento | ✅ qualquer cliente | ✅ qualquer cliente | ✅ apenas para si | ✅ se org permitir guest |
| Cancelar agendamento | ✅ qualquer | ✅ só próprio profissional | ✅ só próprio (antecedência mínima) | ❌ |
| CRUD serviços | ✅ | ❌ | ❌ | ❌ |
| CRUD profissionais | ✅ | ❌ | ❌ | ❌ |
| Configurar horários | ✅ | ✅ só próprios | ❌ | ❌ |
| Convidar staff | ✅ | ❌ | ❌ | ❌ |

> "ANÔNIMO" no MVP só funciona se a Organization permitir `allowGuestBooking` — feature simples no schema, padrão `false`. Decisão por barbearia.

## Validação (Zod) — obrigatório em toda fronteira

```ts
// src/lib/validators/booking.ts
import { z } from "zod";

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  startsAt: z.coerce.date().refine((d) => d > new Date(), {
    message: "Data deve ser no futuro",
  }),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/)
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

Uso:

```ts
// Server Action
"use server";
import { createBookingSchema } from "@/lib/validators/booking";

export async function createBooking(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const input = createBookingSchema.parse(raw); // throw → caught pelo error.tsx
  // ...
}
```

## RLS no banco

Detalhes completos em [03-modelo-dados.md](03-modelo-dados.md). Resumo:

- Toda tabela de tenant tem policy `organization_id = current_org_id()`.
- `FORCE ROW LEVEL SECURITY` para que mesmo o owner aplique.
- Conexão da aplicação (`app_user`) **nunca** tem `BYPASSRLS`.
- Antes de qualquer query, transação seta `SET LOCAL app.current_org_id`.

## OWASP Top 10 — mapeamento

| Risco | Como atacamos |
|---|---|
| A01 Broken Access Control | RLS + middleware + checagem de role + ownership em Server Actions |
| A02 Cryptographic Failures | bcrypt cost 12, TLS via Vercel, `NEXTAUTH_SECRET` rotativo |
| A03 Injection | Prisma parametrizado (nunca `$queryRawUnsafe` com input do usuário); Zod em toda borda |
| A04 Insecure Design | docs claros; revisão de PR humana obrigatória |
| A05 Security Misconfiguration | headers via `next.config.ts`; `.env` fora do git; CI checa secrets |
| A06 Vulnerable Components | Dependabot; `pnpm audit` no CI; major upgrades via PR dedicada |
| A07 Identification/Auth Failures | NextAuth + bcrypt + rate limit + email verification |
| A08 Software/Data Integrity Failures | lockfile commitado; CI verifica integridade |
| A09 Logging Failures | logs de auth e mutações sensíveis com `pino`; nunca logar senha/PII em texto |
| A10 SSRF | sem URL externa via input de usuário; webhook outbound só para domínios allowlisted |

## Headers de segurança

`src/middleware.ts` aplica em toda response:

```ts
const headers = new Headers(response.headers);
headers.set("X-Content-Type-Options", "nosniff");
headers.set("X-Frame-Options", "DENY");
headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
headers.set(
  "Content-Security-Policy",
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; ")
);
// HSTS é setado pela Vercel automaticamente em prod
```

CSP `unsafe-inline` para script é necessário em dev (HMR) — em prod, considerar nonces (v2).

## Rate limiting

- **Login:** 5 tentativas / IP / 15 min. Implementação: contador em memória no MVP (Vercel KV se escalar).
- **Server Actions de mutação:** 30 / minuto / usuário.
- **Fluxo público de agendamento:** 10 confirmações / IP / hora (anti-abuso).

Lib sugerida: `@upstash/ratelimit` se subir Upstash; senão, contador em memória + LRU.

## Secrets management

- `.env.local` em dev, **fora do git** (.gitignore).
- Vercel: variáveis de ambiente via dashboard; preview branches usam preview env.
- Rotação de `NEXTAUTH_SECRET`: invalida todas as sessões — comunicar.
- Banco: senha rotativa a cada 90 dias em prod.

Variáveis obrigatórias (`.env.example`):

```env
# Banco
DATABASE_URL=postgresql://...           # app_user (RLS on)
DIRECT_URL=postgresql://...             # migrações (bypass RLS)

# Auth
NEXTAUTH_SECRET=                        # gere com: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (opcional em dev)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev

# App
APP_TIMEZONE=America/Sao_Paulo
```

## Logging e auditoria

- Logs via `pino` em JSON, com correlação de request via `nanoid` no middleware.
- Eventos auditados (campo `event` no log):
  - `auth.login.success`, `auth.login.failure`
  - `auth.signup`
  - `auth.password_reset.requested`, `auth.password_reset.completed`
  - `booking.created`, `booking.cancelled`
  - `admin.service.created`, `admin.professional.created`
- **Nunca** logar senha, password hash, token de verificação, ou `req.body` cru.

## LGPD (resumo MVP)

- **Dados coletados:** nome, email, telefone (opcional), histórico de agendamentos.
- **Finalidade:** prestação do serviço.
- **Compartilhamento:** Resend (envio de email), provedor de banco (Neon), Vercel (hosting). Listados na política.
- **Direitos do titular:** exclusão de conta (endpoint `/conta/excluir` que faz CASCADE em `User`). Exportação manual no MVP.
- **Política de privacidade:** página estática em `/privacidade` redigida antes do go-live.
- **Cookies:** banner simples ("essenciais para funcionamento"); não há tracking de terceiros.

## CSRF

Server Actions do Next 15 têm proteção automática (origin check + secret). API routes precisam de verificação manual com `next-auth` token ou `samesite` cookie.

## Checklist pré-deploy de prod (D7)

- [ ] `.env` de prod com secrets fortes (`openssl rand`)
- [ ] `DATABASE_URL` aponta para `app_user` (não superuser)
- [ ] RLS ativo e testado (rodar `tests/integration/tenant-isolation.test.ts`)
- [ ] CSP sem `unsafe-eval`
- [ ] HSTS confirmado (verificar header da Vercel)
- [ ] Rate limit ativo em `/api/auth/*` e `/agendar/confirmar`
- [ ] Política de privacidade publicada
- [ ] Backup do Neon configurado (point-in-time recovery)
- [ ] `pnpm audit --prod` sem `high`/`critical`
