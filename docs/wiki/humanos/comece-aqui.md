# 🚀 Comece aqui (10 min)

> Do clone à primeira PR aberta. Se algo travar, [faq.md](faq.md) cobre os erros mais comuns.

## ✅ Pré-requisitos (5 min)

```bash
node --version    # ≥ 20
pnpm --version    # ≥ 9
docker --version  # qualquer recente (ou conta Neon/Supabase)
git --version     # ≥ 2.30
```

Faltando? `node`/`pnpm` via [pnpm.io/installation](https://pnpm.io/installation); Docker Desktop ou Rancher Desktop.

## 1. Clone + install (1 min)

```bash
git clone <repo-url> barbearia
cd barbearia
pnpm install
```

## 2. Variáveis de ambiente (1 min)

```bash
cp .env.example .env.local
```

Mínimo pra rodar local:
- `DATABASE_URL` (já preenchida para Postgres local `localhost:5432`)
- `NEXTAUTH_SECRET` — gere com `openssl rand -base64 32` e cole

Opcional (skip no MVP): `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`.

## 3. Subir banco (1 min)

```bash
docker compose up -d db
```

Confirma: `docker ps` deve mostrar `barbearia-postgres` Up.

> ⚠️ Se `docker-compose.yml` ainda não existir, é porque [PBI-01](../../11-pbis-detalhado.md#pbi-01--postgres-local--rls--migration-inicial) não foi merjeada. Use Neon como fallback: criar projeto grátis em [neon.tech](https://neon.tech), copia a connection string pra `DATABASE_URL`.

## 4. Schema + seed (1 min)

```bash
pnpm db:push    # cria as tabelas
pnpm db:seed    # popula org demo + admin + 2 profs + 4 serviços
```

Login admin pra testar: `admin@demo.com` / `senha123`.

## 5. Rodar (30s)

```bash
pnpm dev
```

Abre http://localhost:3000:
- Público: `/barbearia-demo` → fluxo de agendamento
- Admin: `/login` → `admin@demo.com` / `senha123` → `/admin/agenda`

## 6. Pega uma PBI

1. Abre [`docs/11-pbis-detalhado.md`](../../11-pbis-detalhado.md) (estruturada em back/front/regra/testes).
2. Ou abre [board Trello](https://trello.com/b/hYZHvqGV/barbearia) → coluna **Task**.
3. Escolhe uma PBI `pending` sem dependência aberta. [Como mover de Task → Doing](faq.md#como-mover-um-card-no-trello).
4. Cria branch: `git checkout -b feat/<slug>` (ex: `feat/slot-calculator`).
5. Implementa **lendo o bloco inteiro da PBI**: contexto, AC, arquivos, instruções.
6. Antes de PR: `pnpm typecheck && pnpm lint && pnpm test:run` verde.
7. PR usando o template — link para a PBI no corpo.

## 7. Abrir PR

```bash
git push -u origin feat/<slug>
gh pr create --fill   # ou abre via web
```

Pelo menos 1 reviewer aprovado. 2 se mexer em `prisma/`, `auth`, `middleware`, RLS.

## 🧭 Próximos passos

- [Trilhas por papel](trilhas.md) — onde focar conforme sua função
- [Glossário](glossario.md) — termos do domínio
- [Regras de negócio](../../07-regras-negocio.md) — RN-01..20 (toda PR de domínio toca aqui)
- [Padrões de código](../../06-padroes-codigo.md) — leitura obrigatória antes da 1ª PR

## 🆘 Travou?

- Erros comuns: [faq.md](faq.md)
- Comportamento esperado vs observado: pergunte no canal do time (incluindo o output do erro)
- Bug no CI? `pnpm typecheck` localmente costuma reproduzir
