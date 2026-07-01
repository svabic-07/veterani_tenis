<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TVS — projektni vodič

Komunikacija: **srpski**. Sajt: dvojezičan (SR default, EN). Detalji: `docs/TVS-Redizajn-Specifikacija.html`, `docs/TVS-Plan-Implementacije.md`.

## Konvencije
- **Next.js 16**: `params` je `Promise` — uvek `await`. Middleware je preimenovan u **`proxy.ts`**.
- **next-intl v4** `localePrefix: "as-needed"`. Rute pod `src/app/[locale]/`. Navigacija: `Link`/`useRouter` iz `@/i18n/navigation`, NE iz `next/*`.
- **Tailwind v4**: tokeni u `src/app/globals.css` (`@theme`) — boje `clay/court/ball/navy/bg/line/slate/muted`, `font-display` (Sora), `font-sans` (Inter), `font-mono` (JetBrains).
- **Supabase**: `src/lib/supabase/{client,server}.ts` (server je `async`). Tipovi: `pnpm db:types`. Sve mutacije preko RLS; klijent = anon ključ, nikad service-role. Helperi: `is_staff/is_coordinator/is_admin/is_referee`.

## Cloud (jedini resursi)
Supabase `xvgmkdvhmveqyicautpi` · Vercel `prj_j4zTPYcJTGhd1LqqqFPYxhLFdTfR` (tim `team_j9xXu6MjUJP3Z8abVpBNVLAN`) · GitHub `svabic-07/veterani_tenis`.
⚠️ **CourtNomad se NE dira** (odvojen projekat, samo referenca u spec-u).

## Pre commita
`pnpm typecheck && pnpm lint && pnpm build` mora da prođe.
