# Protótipos — D1

## 🎯 Protótipo principal (sistema completo)

[**system.html**](system.html) — SPA navegável com **15 telas** do sistema completo, mobile-first, dark mode, paleta integrada via CSS vars (HSL).

- Cliente: login, vitrine, 4 passos de agendamento, confirmação, meus agendamentos, perfil
- Admin: dashboard, agenda do dia, serviços (CRUD), profissionais (CRUD + horários), configurações
- **Toggle no canto superior direito**: 🌙/☀️ tema · ▦ navegador de telas

Esta é a base visual + interativa que vamos transpor pro app Next.js.

## 🎨 Variações visuais (landing pages para escolha de direção)

5 single-page para você comparar estilos antes da implementação final:

| # | Arquivo | Estilo | Persona |
|---|---|---|---|
| 01 | [01-classic-barbershop.html](01-classic-barbershop.html) | Barbearia clássica — dark + dourado, serif | Homem 25-45, corte + barba |
| 02 | [02-luxury-salon.html](02-luxury-salon.html) | Salão luxo — champagne, claro, elegante | Mulher 30-55, coloração + spa |
| 03 | [03-modern-unisex.html](03-modern-unisex.html) | Unisex moderno — clean, neutro, sans | Público geral, "Apple-feel" |
| 04 | [04-vibrant-trendy.html](04-vibrant-trendy.html) | Vibrante — gradiente, colorido | 18-30, urbano |
| 05 | [05-mobile-app-feel.html](05-mobile-app-feel.html) | App mobile — parece app nativo | Mobile-only, PWA |

## Como usar

1. Abra cada um no navegador.
2. Anote o que gostou em cada (tipografia, paleta, layout de cards, hero, CTA).
3. Me diga qual seguir como base — ou misture elementos ("hero do 02 + CTA do 04").
4. Aplico a escolha no app Next.js (`src/app/`) substituindo o protótipo atual.

## Stack dos protótipos

- Tailwind CSS via Play CDN
- Google Fonts (varia por protótipo)
- Lucide icons via CDN (alguns) / emojis / SVG inline
- HTML puro, sem JS além de pequenas interações

**Não é código de produção** — é mock visual para decidir direção.
