# TVS — Status projekta

> **Poslednje ažurirano:** 2026-07-02
> **Faza:** 0 ✅ završena · 1 🔶 u toku (javni read-sloj gotov)
> Prati: `docs/TVS-Plan-Implementacije.md` i `docs/TVS-Redizajn-Specifikacija.html`

---

## 1. Ukratko

Informacioni sistem „Teniski Veterani Srbije" — 4 portala (javni, igrački, sudijski★, koordinatorski) nad jednom Supabase bazom. Dvojezično (SR default, EN). Model: ITF World Tennis Masters Tour + TVS pravila (kategorije I–V, starosne 20–90, serije 2000–250 + Master).

**Javni deo sajta je izgrađen, verifikovan i deployovan.** Sve je vezano na bazu i „upali se" čim stignu migrirani podaci.

---

## 2. Resursi i linkovi

| Šta | Vrednost |
|---|---|
| **Live (Vercel)** | https://veteranitenis-svabic-6407s-projects.vercel.app *(iza Vercel Authentication zaštite — vidljivo ulogovanom)* |
| **GitHub** | https://github.com/svabic-07/veterani_tenis (grana `main`, auto-deploy) |
| **Vercel projekat** | `prj_j4zTPYcJTGhd1LqqqFPYxhLFdTfR` · tim `team_j9xXu6MjUJP3Z8abVpBNVLAN` (svabic-6407s-projects) |
| **Supabase (aktivna)** | projekat `veterani-tenis` · ref `ckfbofnjgotarmpiphgz` · region eu-central-1 |
| **Supabase (stara, zaglavljena)** | `xvgmkdvhmveqyicautpi` — zaglavljena u `COMING_UP`; obrisati preko Supabase support tiketa da ne teče naplata |

> ⚠️ **CourtNomad se NE dira** — odvojen projekat, samo referenca u specifikaciji.

---

## 3. Tehnologija

Next.js 16 (App Router, RSC, Server Actions, TS, Turbopack) · Tailwind v4 · next-intl v4 (`as-needed`: SR bez prefiksa, EN `/en`) · Supabase (Postgres + Auth + RLS) · pnpm · Vercel.

Dizajn tokeni (`src/app/globals.css` `@theme`): boje `clay/court/ball/navy`, fontovi Sora/Inter/JetBrains Mono.

---

## 4. Stranice (javni deo)

| Ruta | Tip | Status | Izvor podataka |
|---|---|---|---|
| `/` (početna) | ISR 10m | ✅ | naredni turniri iz baze |
| `/kalendar` | dinamička | ✅ | `tournaments` + `clubs` + direktor |
| `/turnir/[slug]` | dinamička | ✅ | turnir + konkurencije |
| `/igraci` | dinamička | ✅ | `players` (pretraga + filter kategorije) |
| `/igraci/[id]` | dinamička | ✅ | profil igrača |
| `/rang-liste` | dinamička | ✅ (prazno) | `rankings` (kat × disc), čeka obračun |
| `/pravilnik` | statička | ✅ | sadržaj iz spec-a (dvojezično) |
| `/o-savezu`, `/kontakt` | statička | ✅ | statički sadržaj |
| `/sudija` | statička | 🔶 WIP | Faza 3 |
| `/prijava` | statička | 🔶 WIP | Faza 2 (Auth) |
| `/vesti` | statička | 🔶 WIP | Faza 1/4 (CMS) |

Plus: `/icon` (generisana PWA ikonica), `/manifest.webmanifest`, `generateMetadata` naslovi.

---

## 5. Baza podataka

**Primenjene migracije** (`supabase/migrations/`):

1. `…090000_init_enums` — ekstenzije (pgcrypto, citext), 12 enuma, `set_updated_at()`
2. `…090100_rbac` — `user_roles`, `profiles`, helperi (`has_role/is_staff/is_coordinator/is_admin/is_referee`), auto-profil trigger, RLS
3. `…090200_identity` — `clubs`, `players`, `player_private` (zaštićen JMBG/kontakt), `seasons`
4. `…090300_tournaments` — `tournaments`, `tournament_events`, `is_tournament_director()`
5. `…090500_security_hardening` — fiksiran search_path, EXECUTE lockdown (advisors čisti)
6. `…090600_rankings` — `ranking_points`, `rankings`

**Seed** (`supabase/seed.sql`): sezona 2026, 8 klubova, 8 direktora (kao igrači), 8 turnira, 31 konkurencija.

**RLS:** javno čitanje (`clubs/players/seasons/tournaments/tournament_events/ranking_points/rankings`); `player_private` samo staff/vlasnik; sve mutacije preko `is_staff()`/direktora. ✅ provereno (anon čita javno, PII blokiran).

**Još nije kreirano (Faza 2/3/4):** `entries`, `draws`, `matches`, `match_sets`, `scoring_tables`, `payments`, `sanctions`, `news`/`gallery`, `audit_log`.

---

## 6. Šta čeka tebe / sledeći koraci

### 🔴 Blokira dublju Fazu 1 — izvoz stare baze
Za migraciju **~2.600 igrača** treba izvoz sa aktuelnog sajta: igrači, klubovi, istorija turnira, bodovi (CSV / Excel / SQL). Tada: idempotentna migracija + validacija → rang liste, direktorijum i profili se pune pravim podacima.

### 🟡 Odluka — sledeći veliki korak (ne zavisi od podataka)
- **A) Auth (Faza 2)** — igrački nalozi; dira `proxy.ts` (jedini rizik po i18n rutiranje).
- **B) Žreb engine (Faza 3)** — ITF nošenje/bracket/bye/grupa od 5; testabilno sintetičkim igračima, ne dira proxy. *(preporuka)*
- **C) Pauza** dok ne stigne izvoz.

### 🟢 Sitnice (Faza 5/6)
- Obrisati staru zaglavljenu Supabase bazu (support tiket).
- Vercel region `iad1` → `fra1` (baza je u Frankfurtu) radi latencije.
- Domen na Vercel + isključiti Deployment Protection kad ide u javnost.

---

## 7. Dnevnik (commit-i)

| Datum | Commit | Opis |
|---|---|---|
| 2026-07-01 | `Faza 0: temelj` | Next.js + i18n + dizajn + RBAC/RLS migracije (fajlovi) |
| 2026-07-01 | `Faza 1 (start)` | Nova baza + migracije primenjene + kalendar iz Supabase-a |
| 2026-07-02 | `Faza 1: turnir + pravilnik` | Stranica turnira + pravilnik |
| 2026-07-02 | `Faza 1: početna + footer` | Naredni turniri na početnoj + o-savezu/kontakt/sudija |
| 2026-07-02 | `Faza 1: igrači + rang` | Direktorijum, profil, rang liste + rang tabele |
| 2026-07-02 | `Faza 1: PWA + SEO` | Ikonica + manifest + naslovi stranica |

---

## 8. Pokretanje

```bash
pnpm install
cp .env.example .env.local   # Supabase URL + anon ključ (već postavljeno lokalno)
pnpm dev                      # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm build   # pre svakog commita
```
