# Teniski Veterani Srbije (TVS)

> 📊 **Aktuelni status projekta:** [`STATUS.md`](STATUS.md)

Informacioni sistem sa četiri povezana portala oko jedne Supabase baze:

1. **Javni sajt** — kalendar, žreb i rezultati uživo, rang liste, profili igrača, vesti (SR/EN)
2. **Igrački portal** — prijava/odjava na turnire, profil, partneri, lični rezultati
3. **Sudijski portal** ★ — žreb, satnica, unos rezultata (mobile-first, prioritet)
4. **Koordinatorski panel + admin** — bodovni model, obračun ranga, korekcije, sistem

Model: ITF World Tennis Masters Tour, prilagođen TVS kategorijama (kvalitativne I–V, starosne 20–90) i pravilima.

## Tehnologija

| Sloj | Izbor |
|---|---|
| Front | Next.js 16 (App Router, RSC, Server Actions), TypeScript |
| Baza/Auth | Supabase (Postgres + Auth + Storage + Realtime), RLS + SECURITY DEFINER RPC |
| Hosting | Vercel |
| i18n | next-intl — SR (default, bez prefiksa) + EN (`/en`) |
| UI | Tailwind CSS v4 (dizajn tokeni: clay / court / ball / navy) |

## Pokretanje

```bash
pnpm install
cp .env.example .env.local   # popuni Supabase URL + anon ključ
pnpm dev                      # http://localhost:3000
```

## Skripte

| Komanda | Opis |
|---|---|
| `pnpm dev` | razvojni server |
| `pnpm build` | produkcijski build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:types` | regeneriši Supabase tipove (`supabase` CLI) |

## Struktura

```
src/
  app/[locale]/        rute (SR/EN); layout, početna, javne stranice
  components/          UI komponente (header, footer, logo, ...)
  i18n/                next-intl (routing, request, navigation)
  lib/supabase/        klijenti (client/server) + generisani tipovi
  proxy.ts             next-intl proxy (bivši middleware)
messages/              sr.json, en.json
supabase/migrations/   SQL migracije (enumi, RBAC, identitet, turniri)
docs/                  specifikacija i plan (HTML/MD)
```

## Baza podataka

Migracije u `supabase/migrations/` (redosled bitan):

1. `..._init_enums.sql` — ekstenzije, enumi, `set_updated_at()`
2. `..._rbac.sql` — `user_roles`, `profiles`, helperi (`has_role`, `is_staff`, …), RLS
3. `..._identity.sql` — `clubs`, `players`, `player_private`, `seasons`
4. `..._tournaments.sql` — `tournaments`, `tournament_events`

Sve mutacije idu preko RLS-a; `players`/`tournaments` su javno čitljivi, PII (`player_private`) je zaštićen.

## Plan po fazama

Vidi `docs/TVS-Plan-Implementacije.md`. Trenutno: **Faza 0 (temelj)** — skela, dizajn sistem, i18n, RBAC/RLS migracije, javni shell.
