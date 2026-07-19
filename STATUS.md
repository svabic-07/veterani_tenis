# TVS — Status projekta

> **Poslednje ažurirano:** 2026-07-18
> **Faza:** 0 ✅ · 1 ✅ (javni sloj + pravi podaci + **istorija: 154 turnira, 6.745 mečeva, rang liste**) · 2 🔶 (aktivacija naloga ✅ + samoprijava singl + zahtev za kategoriju; ostaje custom SMTP + aktivacioni kodovi) · 3 ✅ **KOMPLETNA** (žreb → rezultati → obračun; zaključavanje posle završetka i u RLS; izveštaj sudije, štampa satnice, offline) · 4 ✅ jezgro (mini-admin; **oba bodovna modela** + gost/solo pravila + nedeljni cron rang; ostaje SMTP blast) · 5 🔶 (dvojezičnost ✅ + PWA offline ✅ + redizajn ✅, ostaje E2E) · **Revizija Claude+Codex 2026-07-18 ✅** (2 kritična nalaza popravljena isti dan)
> Prati: `docs/TVS-Plan-Implementacije.md` i `docs/TVS-Redizajn-Specifikacija.html`

---

## 1. Ukratko

Informacioni sistem „Teniski Veterani Srbije" — 4 portala (javni, igrački, sudijski★, koordinatorski) nad jednom Supabase bazom. Dvojezično (SR default, EN). Model: ITF World Tennis Masters Tour + TVS pravila (kategorije I–V, starosne 20–90, serije 2000–250 + Master).

**Javni deo sajta je izgrađen, verifikovan i deployovan.** Podaci sa starog sajta su **migrirani** (2.831 igrača, 427 klubova, kontakti) — direktorijum, profili i filteri rade nad pravim podacima.

---

## 2. Resursi i linkovi

| Šta | Vrednost |
|---|---|
| **Live (Vercel)** | **https://project-82ord.vercel.app** *(radi javno; „test" domen — pravi domen uskoro). Uzrok ranijih 404 na svim `.vercel.app`: Framework Preset bio „Other" umesto „Next.js" — ispravljeno 2026-07-16 (potvrdio Vercel support). `live:false` je bio red herring.* |
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
| `/kalendar` | dinamička | ✅ | **predstojeći + arhiva po godinama + pobednici po kategoriji** |
| `/turnir/[slug]` | dinamička | ✅ | turnir + konkurencije |
| `/igraci` | dinamička | ✅ | `players` (pretraga + filter kategorije) |
| `/igraci/[id]` | dinamička | ✅ | profil: **trofeji (🥇🥈🥉)** + rang + istorija turnira + poslednji mečevi |
| `/rang-liste` | dinamička | ✅ | `rankings` (kat × disc) — **popunjeno iz istorije** |
| `/pravilnik` | statička | ✅ | sadržaj iz spec-a (dvojezično) |
| `/o-savezu`, `/kontakt` | statička | ✅ | statički sadržaj |
| `/sudija` | dinamička | ✅ | lista turnira koje nalog vodi (staff/direktor) |
| `/sudija/[slug]` | dinamička | ✅ | kreiraj/objavi žreb, unos rezultata (auth + RLS) |
| `/prijava` | dinamička | ✅ | magic link prijava (Supabase OTP) |
| `/nalog` | dinamička | ✅ | profil naloga + povezivanje sa igračem |
| `/api/auth/confirm` | route handler | ✅ | potvrda email linka (PKCE `code` + `token_hash`) |
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

**Seed** (`supabase/seed.sql`): sezona 2026 + 8 klubova (spojeni sa migriranim klubovima po slug-u, koriste ih pravi igrači). ⚠️ Demo turniri + fejk direktori (`dir-%`) **obrisani 2026-07-14** (i iz baze i iz seed-a) kad su stigli pravi podaci — sada su svi turniri istorijski (`ist-%`, 154). Novi turniri se prave kroz koordinatorski panel.

**Migrirani podaci sa starog sajta (2026-07-13):** ✅ uvezeno **2.831 igrača** (od 2.834 — 3 placeholder zapisa preskočena), **427 klubova** (normalizovano od 572 varijante naziva), **2.176 kontakata** (email/telefon u `player_private`), **950 TVS kategorija** (poslednja poznata godina po igraču). Izvor: `migration-data_2/` (gitignored, PII). Generator: `scripts/generate-import-sql.py` → `scripts/out/*.sql` (gitignored) → primenjeno preko Supabase MCP. Idempotentno (upsert po `legacy_id`; stari numerički ID = `players.legacy_id`). Upozorenja i ~17 mogućih duplikata (isto ime+godište pod dva ID-ja): `scripts/out/warnings.txt` — za ručnu proveru koordinatora.

**Istorija (mečevi, žrebovi, bodovi) — uvezeno 2026-07-14:** ✅ iz `mecevi.jsonl` (13.371) + `turniri_ucesce.jsonl` (7.722) rekonstruisano: **154 turnira** (legacy `ist-%`), **1.142 konkurencije**, **975 žrebova** (eliminacioni, status `zakljucan`), **6.745 mečeva** + **8.412 setova**, **7.718 prijava**, **5.821 bod** (`ranking_points`), **498 rang-pozicija** za **1.008 igrača**, **57 gostiju** (imena bez kartona, legacy `gost-%`). Generator: `scripts/import-history.ts` (deterministički `md5` UUID-i po `turnir:/event:/draw:/match:` ključu → idempotentno) → `scripts/out/history/*.sql` (gitignored). Rekonstrukcija: kostur iz maks. kola, pozicije od finala unazad, pobednik po (1) progresiji u sledeće kolo, (2) osvojenim poenima, (3) prvi_igrac; setovi iz raznih formata (`6:3`, `62`, `9-5`, `wo`→walkover). Primenjeno preko Supabase MCP (paralelni agenti + direktno). ⚠️ Bodovi su iz `osvojeni_poeni` (kako su bili na starom sajtu), NE preračunati kroz `finish_tournament` — istorijski turniri su `zakljucan`, ne prolaze kroz obračun. Rang lista = zbir N-najboljih (`n_best`=8) iz svih aktivnih `ranking_points`.

**RLS:** javno čitanje (`clubs/players/seasons/tournaments/tournament_events/ranking_points/rankings`); `player_private` samo staff/vlasnik; sve mutacije preko `is_staff()`/direktora. ✅ provereno (anon čita javno, PII blokiran).

7. `…100000_auth_activation` — unique `profiles.player_id`, guard trigger, `claim_player()`/`my_player_candidates()`
8. `…110000_revoke_anon_definer_exec` — advisor 0028 čišćenje
9. `…120000_draws` — **`entries`, `draws`, `matches`, `match_sets`** + enumi (`draw_type`, `draw_status`) + `can_manage_event()`; RLS: javno vidi samo objavljen/zaključan žreb, piše staff/direktor turnira

10. `…0714090000_scoring` — **`scoring_tables`** (140 redova, klasični model) + **`finish_tournament()`** (obračun + nedeljni rang)
11. `…0714110000_koordinator` — **`audit_log`** + `revoke_draw`/`clear_match_result`/`reopen_tournament`/`admin_list_users`
12. `…0714130000_podiums` — **`player_podiums`** view (plasman 1/2/3 po konkurenciji; `security_invoker`) za pobednike turnira i trofeje igrača
13. `…0715120000_self_entry` — **samoprijava igrača (singl)**: RLS `entries self enter/withdraw` + `can_self_enter_event()` + `my_player_id()` + trigger snapshot bodova (ne mogu se lažirati)
14. `…0715140000_category_requests` — **`category_change_requests`** + `request_status` enum; `request_category_change()` (na `/nalog`) i `resolve_category_change()` (staff, menja `players.kategorija`) — uz audit
15. `…0715150000_coordinator_tools` — `update_scoring_points()` (uredive bodovne tablice), `admin_list_referees()`, `assign_tournament_director()` — uz audit
16. `…0716120000_direktor_ime` — `tournaments.direktor_ime` (sudija kao slobodan tekst; može i ne-igrač)
17. `…0716140000_tournament_contact` — `tournaments.domacin/kontakt/lokacija` (kao stari sajt; backfill sa ref sajta: 119 sudija, 121 kontakt, 41 lokacija)
18. `…0716150000_assign_director_name` — `assign_tournament_director` prima i ime (dodela sudije comboboxom)
19. `…0716160000_koordinator_mini_admin` — `set_referee_role()` (koordinator dodeljuje/oduzima ulogu sudija, uz audit)
20. `…0716170000_sekretar` — **`payments`** (članarine/kotizacije; owner read) + **`news`** (CMS v1; javno čitanje objavljenih) + **`merge_players()`** (spajanje duplikata: sve reference → glavni, uz audit)
21. `…0716180000_publish_news` — `publish_news()` (staff ili direktor turnira; auto-izveštaj na „ZAVRŠI TURNIR")
22. `…0718100000_svi_boduju_master` — **Model B „svi boduju"** (Master-stil: pobednik 800 · finale 600 · PF 400 · pobeda u grupi 200 · bez pobede 500 · rezerva 200; kanonski kostur 8, sve serije uklj. Master) + **finish_tournament v2**: validacija pokrivenosti tablice (`missing_scoring_cell` umesto tihog 0), model iz sezone turnira, `n_best` iz sezone turnira
23. `…0718110000_weekly_rankings_cron` — **`recalc_weekly_rankings()`** (pun nedeljni snapshot svih parova) + **pg_cron** `tvs-weekly-rankings` (pon 03:00 UTC) + `admin_recalc_rankings()` (ručno iz panela, uz audit)
24. `…0718120000_atomic_admin_fixes` — **`admin_update_player()`** (atomska izmena igrača uklj. ime/prezime + kontakt) + **merge_players v2** (dedup `ranking_points` po turniru×kat×disc + preračun ranga posle spajanja)
25. `…0718140000_referee_reports` — **`referee_reports`** (izveštaj sudije: loptice dodeljeno/potrošeno, sporne situacije, napomena; interno — RLS staff + direktor turnira)
26. `…0718160000_gost_bez_bodova` — **gost ne dobija bodove** (pravilo saveza; gosti su obično stranci): plasman se kaskadno prenosi niz kostur na pobeđene članove (pobeđeni u finalu nasleđuje gostov plasman itd.; gost-pobedio-gosta se preskače); u čistoj grupi plasman samo među članovima; gost = prijava `status='gost'` ili `legacy_id 'gost-%'`. + `scoring_kolo_rank()` helper. Testirano simulacijom (gost pobednik u eliminaciji: 1000→finalista, 600→PF žrtva itd.; grupa: samo članovi).
27. `…0718180000_solo_kategorija` — **jedini prijavljeni u kategoriji = pobednik „bez borbe"** (bodovi pobednika, kostur 8); uz „Prijavi i u jaču" u portalu igrač osvaja bodove **u obe** kategorije; gost kao jedini prijavljen ne dobija ništa
28. `…0718200000_lock_finished_rls` — **`can_edit_event()`**: RLS zaključavanje završenog turnira (manager write politike na entries/draws/matches/match_sets + direktorske politike) — ni direktan PostgREST poziv ne može da piše po završenom turniru
29. `…0718210000_finish_v5` — revizione popravke obračuna: svi-solo turnir može da se završi; solo samo singl + samo bez ijednog žreba (opozvan = otkazano); **čista grupa tie-break po spec-u** (pobede → h2h → set-razlika → gem-razlika)

⚠️ **Deploy migracija:** `supabase db push` NEBEZBEDAN (remote history koristi druge timestampove nego lokalni fajlovi). Migracije 13–15 primenjene preko Management API `database/query` + upis u `schema_migrations`.

**Još nije kreirano (Faza 4):** `payments`, `sanctions`, `news`/`gallery`.

---

## 6. Šta čeka tebe / sledeći koraci

### ✅ Rešeno — izvoz stare baze je stigao i migriran (2026-07-13)
Igrači + klubovi + kontakti + TVS kategorije su u bazi. **Još nije migrirano** (čeka tabele Faza 3/4): istorija mečeva (`mecevi.jsonl`, 13.371), učešća na turnirima sa poenima (`turniri_ucesce.jsonl`, 7.722), istorija rangiranja po godinama. Izvor ostaje u `migration-data_2/`.

### ✅ Auth (Faza 2) — aktivacija naloga izgrađena (2026-07-13)
Tok: `/prijava` (email → Supabase magic link, bez lozinke) → `/api/auth/confirm` (PKCE `code` i `token_hash` oblik) → `/nalog` (kandidati po `player_private.email` preko `my_player_candidates()`, povezivanje preko `claim_player()`; deljeni klupski emailovi dobijaju picker „Ko ste vi?"). Migracija `20260713100000_auth_activation`: unique `profiles.player_id`, guard trigger (RLS self-update rupa za `player_id` zatvorena), SECURITY DEFINER funkcije testirane u bazi (poklapanje ✓, tuđi igrač ✗, direktan update ✗, zauzet igrač ✗). `proxy.ts` sada radi i Supabase session refresh (statične stranice ostale statične). Header prikazuje „Moj nalog" kad je korisnik prijavljen (klijentski, ne kvari ISR).

**Pre puštanja u javnost — ručna Supabase Auth konfiguracija (dashboard):**
1. **Site URL** → produkcioni domen; dodati i Vercel preview domen u Additional Redirect URLs (sada je `http://localhost:3000`, pa magic linkovi vode na localhost).
2. **Custom SMTP** — ugrađeni Supabase mailer šalje **max 2 emaila/sat** (samo za dev). Resend/Postmark/Brevo + SPF/DKIM na domenu.
3. *(Opciono, preporučeno za starije korisnike)* U email šablon „Magic Link" dodati `{{ .Token }}` (6-cifreni kod) i link na `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email` — kod rešava slučaj „link se otvorio u drugom browseru" (PKCE ograničenje); tada dodati i UI polje za unos koda na `/prijava`.

**Ostaje za kasnije u Fazi 2:** aktivacioni kod preko koordinatora za 656 članova bez kontakta (deo koordinatorskog portala, Faza 4); unos koda na `/prijava` (posle izmene šablona).

### 🔶 Faza 3 — žreb engine + javni prikaz gotovi (2026-07-14)
**Engine** (`src/lib/draw/`, čist TS, bez I/O, **26 vitest testova** — `pnpm test`):
- Kostur po TVS tabeli (do 10 → 8 · 11–20 → 16 · 21–40 → 32 · 41–80 → 64 · 81–128 → 128) — fiksni rasponi jer bodovi zavise od kostura; **višak igra predkolo** (kolo 0).
- ITF nošenje: anchor pozicije po kosturu (N1 vrh, N2 dno, N3–4 četvrtine, N5–8 osmine…), nasumična dodela unutar grupe nosilaca, nerangirani se ne nose.
- Bye nosiocima po opadajućem redu, ostatak žrebom, nikad bye vs bye; bye auto-napreduje.
- Meko razdvajanje kluba (nosioci: polovina/četvrtina; 1. kolo: izbegavanje klupskih parova).
- Grupe: 3–4 jedna grupa · **grupa od 5** (N1/N2 u PF; 2. iz grupe vs N1, 1. vs N2) · 6–7 dve grupe + ukrštena PF; plasman (pobede → h2h → setovi → gemovi); `resolveGroupsIntoSemis`.
- `advanceWinner` — auto-napredovanje kroz bracket (walkover/predaja/retiranje statusi); reproduktivnost: seedovan PRNG (`rng_seed`) + `seed_izvor` snapshot u bazi.

**Javni prikaz:** stranica turnira renderuje objavljene žrebove (bracket kolone po kolima + grupe + predkolo, rezultati po setovima, nosioci `[N]`). Demo žreb: Oktagon Open · I · singl (12 sintetičkih prijava; regenerisanje: `pnpm tsx scripts/demo-draw.ts` → SQL). Verifikovano u browseru.

**Sudijski portal — jezgro gotovo (2026-07-14):**
- `/sudija` — lista turnira koje nalog vodi (koordinator/admin vidi sve; direktor svoje — preko `profiles.player_id` = `tournaments.direktor_id`, tj. direktor prvo aktivira nalog kao igrač).
- `/sudija/[slug]` — po konkurenciji: broj prijava, **Kreiraj žreb** (radna verzija iz `entries` kroz engine), pregled, **Objavi** (tek tada javno vidljiv) / **Poništi** / **Ponovi žreb**; **unos rezultata** (pobednik + „6:3 7:5" + regularno/walkover/predaja/retiranje) sa auto-napredovanjem i automatskim punjenjem polufinala kad se grupe završe (`src/lib/draw/db.ts`).
- Bezbednost verifikovano SQL simulacijom (rollback): igrač bez uloge ❌ · koordinator ✅ · direktor svog turnira ✅ · direktor tuđeg ❌. UI gating: anon → prijava. 27 vitest testova.
- ⚠️ Dodela uloga (koordinator/sudija) je zasad ručna (SQL u `user_roles`) — UI stiže u Fazi 4.

**„ZAVRŠI TURNIR" + obračun bodova (2026-07-14):**
- Migracija `…0714090000_scoring`: **`scoring_tables`** (model × kostur × serija × dostignuto kolo → bodovi; podatak, ne hardkod — 140 redova; kostur 32 tačno iz spec-a, ostali izvedeni istim obrascem ⚠️ koordinator da pregleda pre prve sezone) + **`finish_tournament()`** SECURITY DEFINER funkcija: autorizacija (staff/direktor), validacija (bez radnih žrebova, svi mečevi rešeni), obračun po dostignutom kolu (predkolo/1. kolo bez pobede → utešni; grupe: finalista/PF/eliminisan u grupi), upis `ranking_points` (aktivno 52 nedelje), status `zavrsen`, **nedeljni rang** (N najboljih iz aktivne sezone, rank po kategoriji × disciplini). Sve u jednoj transakciji, idempotentno po turniru.
- UI: sekcija „ZAVRŠI TURNIR" na `/sudija/[slug]` (checkbox potvrda; dostupno tek kad su svi žrebovi objavljeni i mečevi rešeni).
- Testirano SQL simulacijom (rollback): grupa od 5, serija 1000 → pobednik 1000 · finalista 600 · PF 360 · grupa 180; rang #1 upisan; forbidden za korisnika bez prava. ⚠️ Pojednostavljenja v1: čista grupa 3–4 rangira se po pobedama (bez h2h u obračunu); Master serija nema tablicu (poseban obračun — Faza 4); `svi_boduju` model još nema tablicu.

**Prijave + satnica + doterivanje (2026-07-14):**
- **Prijave** na `/sudija/[slug]`: po konkurenciji lista prijavljenih (klub + bodovi za nošenje iz poslednje rang liste), pretraga igrača + „Dodaj", „Ukloni" — sve dok žreb nije objavljen.
- **Satnica**: termin (datetime, čuva se kao pravi trenutak — unos/prikaz po beogradskom vremenu) + teren po meču; javna stranica turnira prikazuje sortiranu satnicu.
- **Zamena pozicija** u radnom eliminacionom žrebu (dva select-a → zameni; bye se ponovo propagira). Za grupe: ponovni žreb.

**Faza 3 — kompletirana 2026-07-18:** evidencija loptica + izveštaj koordinatoru ✅, offline tolerancija ✅, štampanje satnice ✅ (vidi dole).

### 🔶 Faza 4 — koordinatorski panel, jezgro (2026-07-14)
- Migracija `…0714110000_koordinator`: **`audit_log`** (upis samo kroz funkcije) + korekcije kao SECURITY DEFINER funkcije sa auditom: **`revoke_draw`** (opoziv objavljenog žreba), **`clear_match_result`** (poništavanje rezultata + čišćenje propagacije; blokira ako je nizvodni meč rešen; grupni mečevi prazne PF), **`reopen_tournament`** (završen → ponovo otvoren: briše bodove turnira + preračun ranga), **`admin_list_users`** (pregled naloga sa ulogama). Sve staff-only. Testirano SQL simulacijom (rollback).
- **`/koordinator`**: novi turnir (naziv/serija/sistem/klub/direktor po imenu/datumi/rok), lista turnira, **korisnici i uloge** (admin klikom dodeljuje/oduzima; zaštita da admin sebi ne skine admin), audit trag (poslednjih 15).
- **`/sudija/[slug]`** za staff: „Opozovi žreb", „Korekcije rezultata" (poništavanje po meču), „Ponovo otvori turnir" (checkbox potvrda); **konkurencije**: dodavanje (kategorija × disciplina) i brisanje praznih.

**Ostaje u Fazi 4:** SMTP blast (masovni email sa segmentima), disciplinska, **odobravanje članova** (nedovoljno definisano), aktivacioni kodovi za 656 članova bez emaila. *(uredive bodovne tablice UI, dodela sudije, odobravanje kategorije — ✅ 2026-07-15; `svi_boduju` + Master tablica + validacija obračuna, nedeljni cron rang, atomske korekcije — ✅ 2026-07-18, vidi dole)*

### 🔶 Faza 5 — dvojezičnost + PWA + polish (2026-07-14, u toku)
- **EN prevod:** auditom potvrđena parnost `sr.json`/`en.json` (310 = 310 ključeva), statične stranice (`o-savezu`/`kontakt`/`pravilnik`) kroz `L(sr,en)` helper — prevod je kompletan (sistem građen dvojezično od početka). Sitne popravke: metadata fallback naslovi (`Igrač`/`Player`, `Turnir`/`Tournament`) locale-aware; `o-savezu` statistika ~2.600 → ~2.900.
- **PWA instalabilnost:** `manifest.ts` proširen (ikonice **192/512** `any`+`maskable`, `orientation`, `categories`), nove rute `/manifest-icon/[size]` (ImageResponse, maskable navy podloga) + `apple-icon` (180); `theme-color` preko `viewport` export-a. ⚠️ **Bug fix:** `proxy.ts` matcher je presretao `/manifest-icon/*` i `/icon` (nema tačku u putanji) i vraćao 404 — dodati u negativni lookahead. Servisni radnik (offline) **ostaje** — zaseban zadatak, loše podešen SW gori od nijednog.
- **Mobilni QA:** stranica turnira/žreba (najzahtevnija, horizontalni skrol bracket-a) čista na 390px — telo se ne prelama, sekcije pune širine.

**Ostaje u Fazi 5:** servisni radnik za offline (rad na terenu), performanse (Vercel region `iad1` → `fra1`), E2E testovi ključnih tokova, galerija.

### ✅ Redizajn + Faza 4 dopuna + samoprijava (2026-07-15/16)
- **Redizajn (Faza 0–7):** novi dizajn sistem (temelji), potpisni `PageHero` (foto glavni hero + compact letterbox traka na podstranicama, navy gradijent za čitljivost), redizajn kalendara/turnira/igrača/profila/ranga/statika/portala. Hero slike: `tvs-hero-veterani/compact/net.webp` (WebP, promptovi u ChatGPT-u).
- **Samoprijava igrača (singl):** inline na stranici turnira — igrač sa povezanim nalogom se sam prijavljuje/odjavljuje u predstojeće singl konkurencije (u roku, pre žreba); bodovi za nošenje iz triggera (ne mogu se lažirati); javna lista prijavljenih.
- **Faza 4 dopuna:** (a) **uredive bodovne tablice** — podstranica `/koordinator/bodovne-tablice`; (b) **dodela sudije** turniru (select u listi turnira); (c) **odobravanje promene kategorije** — igrač traži na `/nalog`, koordinator odobrava/odbija (sekcija u panelu). Sve uz audit.
- **Prikaz turnira:** završeni turniri drugačiji (topliji) background na kartici; konkurencije sortirane po kategoriji (I…IX pa starosne); **🏆 pobednik po konkurenciji** u zaglavlju žreba; **round-robin grupe** (uvezene kao kolo>0) prikazane kao „Grupa" sa tabelom pobeda umesto polomljenog bracket-a (`src/lib/draw-groups.ts`).
- **Kalendar:** particija STROGO po datumu (predstojeći = svi budući; arhiva = samo prošli) + „Prijavi se" dugme na predstojećim.
- **Podaci — dopuna rezultata sa ref sajta:** turnir **Oktagon Open Pančevo 11.07.2026** (156) — pun rezultati (27 mečeva, 4 kat) + bodovi + rang; **ITF MT400 Serbia Open 16.05.2026** (149) — bodovi/rang (ref sajt nema detalje mečeva). Ostalih 8 praznih turnira nema podatke ni na ref sajtu. Rezultati skinuti iz `data-json` ref stranica (igrači upareni po `legacy_id` = ref `clan_id`).
- **Vercel:** glavni projekat popravljen (Framework Preset), demo projekat `veterani-tenis-demo` obrisan, naplata rešena. `/en` radi (bila lažna uzbuna). not-found stranica → client component (prevodi se razrešavaju).

### ✅ Koordinatorski mini-admin + sudijski UX (2026-07-16, popodne)
Koordinator = sekretar saveza, sve kroz UI bez programera:
- **Panel:** aktivni/predstojeći turniri na vrhu (novi kreiran odmah vidljiv), završeni u sklopivoj sekciji; naziv → javna stranica, „Upravljaj" → sudijski portal; linkovi: Klubovi · Članovi · Uplate · Vesti · Bodovne tablice.
- **Novi turnir:** sudija combobox (kucaš → predlozi igrača; može i slobodno ime — `direktor_ime`), klub → **Mesto autofill** (iz `clubs.grad`), polja Domaćin/Kontakt/Lokacija; **automatski kreira konkurencije** (kvalitativni I–V / starosni 30–75, singl).
- **Upravljanje turnirom** (`/sudija/[slug]`, staff/direktor): ⚙️ Podešavanja (svi podaci turnira), prijave (dodaj/ukloni/pretraga), **„Dodaj gosta"** (kreira ne-člana + odmah prijava), **„Premesti u…"** (prebaci prijavu u drugu kategoriju — bodovi za nošenje se preračunaju), **ručne oznake nosilaca** (N polje; fallback automatski po bodovima).
- **Žreb:** broj nosilaca **uvek po kosturu** (8→2, 16→4…), i bez rang bodova; **bodovi za nošenje vidljivi u žrebu** (uz ime, dok meč nema rezultat).
- **Unos rezultata:** strukturisan po setovima (boks po set), auto-fokus, auto-dodavanje sledećeg seta, **auto-detekcija pobednika** (ručno pregazivo); satnica: **datum prvog dana predefinisan** (upisuje se samo vreme i teren).
- **„ZAVRŠI TURNIR" → auto-izveštaj u vestima:** uvod (mesto/datumi/serija/domaćin/sudija) + 🏆 pobednici po konkurencijama + finale/polufinale sa rezultatima (iz ugla pobednika); grupe kao plasman po pobedama (`src/lib/tournament-report.ts`, testirano na stvarnim podacima).
- **Članovi** (`/koordinator/clanovi`): novi igrač ili gost; **izmena igrača** (godište, kategorija, klub, aktivan, **email** — otključava aktivaciju naloga, telefon); **spajanje duplikata** (`merge_players`); „Kopiraj sve email adrese" (2.034, za BCC).
- **Klubovi** (`/koordinator/klubovi`): dodavanje + izmena grada (puni autofill Mesta). **Uplate** (`/koordinator/uplate`): članarine/kotizacije po igraču. **Vesti** (`/koordinator/vesti` + javna `/vesti`): CMS v1 (objavi/sakrij/obriši; ISR 5 min).
- **Uloge:** koordinator klikom dodeljuje/oduzima ulogu **sudija** (`set_referee_role`); ostale uloge i dalje samo admin.
- **Auth fix:** Supabase Site URL + redirect allow-lista → produkcija (magic link više ne vodi na localhost); prijava radi na produkciji.
- ✅ Test podaci **obrisani 2026-07-18**: turniri „Test 8" i „Test Sudijski — Žreb 16" + njihovih 14 bodova + test gost — kaskadno kroz bazu (bodovi eksplicitno jer je FK `SET NULL`), rang preračunat (508 redova), verifikovano na produkciji (404 + nema na kalendaru).

### ✅ Integritet obračuna + nedeljni rang + atomske korekcije (2026-07-18)
Po zajedničkoj analizi Claude + Codex (GPT 5.6) — prioritet: zaštita zvaničnog obračuna.
- **Model B „svi boduju"** (migracija 22): tablica po spec-u (uredivo u panelu, novi tab „Svi boduju" na `/koordinator/bodovne-tablice`; ne zavisi od kostura); obračun = plasman (pobednik/finale/PF) + pobede pre završnice × „pobeda u grupi", donja granica „bez pobede" za svakog učesnika. Radi za grupe (grupa/grupa5) i eliminaciju; model se bira na turniru ili nasleđuje iz sezone (`default_scoring`).
- **Validacija tablice u `finish_tournament`**: nedostajuća ćelija → greška `missing_scoring_cell:serija:kostur:kolo` (prevedena poruka u sudijskom UI) umesto tihog 0 bodova. `n_best` i model sada iz **sezone turnira** (ne globalno aktivne).
- **Nedeljni cron rang** (migracija 23): pg_cron ponedeljkom 03:00 UTC — bodovi stariji od 52 nedelje ispadaju i bez novog turnira; dugme „Preračunaj rang sada" u panelu (audit).
- **Atomske korekcije** (migracija 24 + akcije): izmena igrača kroz `admin_update_player` RPC (uklj. **ime/prezime**); izmena **naziva kluba**; novi turnir briše turnir ako konkurencije ne prođu; premeštanje prijave prvo upisuje novu pa briše staru; gost bez siročića; auto-vest javlja kad NIJE objavljena (`ok=zavrsenBezVesti`); `merge_players` dedup bodova istog turnira + preračun ranga.
- Testirano SQL simulacijom (rollback) na produkcionoj bazi: regresija klasičnog obračuna 0 razlika; svi_boduju 28/28 učesnika boduje; grupa5 tačno po spec-u (P1=800, P2=600, P3=400+2×200, P4=400+200, P5=500); `missing_scoring_cell` validacija; model iz sezone; recalc 528 redova. Migracije primenjene preko Management API + `schema_migrations`.
- ⚠️ Codex-ovi preostali nalazi (u backlog): uplate bez veze sa turnirom kroz UI, CMS bez izmene vesti, audit samo 15 zapisa, greške baze izgledaju kao prazne liste, sezona bez UI.

### ✅ Sudijski paket: zaključavanje + izveštaj + štampa + offline (2026-07-18, popodne)
- **Posle „ZAVRŠI TURNIR" nema izmena:** `guardOpen` u sudijskim akcijama (svih 14 mutacija odbija izmene na završenom turniru — jedini put je koordinatorsko „Ponovo otvori"); UI sakriva podešavanja/prijave/satnicu/kreiranje žreba (read-only pregled).
- **Javna stranica završenog turnira:** sekcija „Osvojeni bodovi" po konkurenciji (iz `ranking_points`, radi i za istorijske turnire) — uz postojeći kostur, grupe i 🏆 pobednike.
- **Izveštaj sudije** (migracija 25): loptice dodeljeno/potrošeno + sporne situacije + napomena; upisiv i posle završetka; koordinatorski panel prikazuje poslednjih 10 („Izveštaji sudija", sporne istaknute).
- **Štampanje satnice:** `/turnir/[slug]/satnica` — tabela po danima (vreme/teren/meč/konkurencija), dugme Štampaj, print CSS (header/footer sajta `print:hidden`); linkovi sa javne stranice i sudijskog portala.
- **Offline (PWA):** `public/sw.js` — network-first (keš SAMO kad mreže nema — nikad zastareo sadržaj online), `/_next/static` cache-first (hešovano), `/api`+`/prijava`+`/nalog` se ne keširaju; odvojeni ključevi HTML vs RSC (Next prefetch ne gazi HTML); `offline.html` fallback. **Verifikovano Playwright-om:** keširana stranica se otvara sa ugašenim serverom, nekeširana pada na offline poruku.

### ✅ Revizija sistema Claude + Codex (2026-07-18, veče)
Dvostruka revizija (Codex GPT 5.6 čitao kod + Claude SQL/RLS/smoke testovi). Popravljeno isti dan:
- **KRITIČNO — guardOpen slug spoof**: server akcije su status turnira čitale iz `slug`-a u formi (falsifikovanje zaobilazi zaključavanje). Fix: status se razrešava iz entiteta (meč→žreb→konkurencija→turnir). **+ RLS sloj** (migracija 28): `can_edit_event()` — sve „manager write" politike (entries/draws/matches/match_sets) + direktorske politike odbijaju pisanje na završenom turniru i pri direktnom PostgREST pozivu.
- **KRITIČNO — SW privatnost**: `/sudija` i `/koordinator` dodati u NEVER_CACHE (keš je zajednički za sve naloge istog browser profila); verzija keša `tvs-v2`. Offline za teren i dalje radi preko javne stranice turnira.
- **finish_tournament v5** (migracija 29): turnir samo sa solo kategorijama može da se završi; solo pravilo samo za singl i samo kad kategorija NIKAD nije imala žreb (opozvan = otkazana); **čista grupa tie-break po spec-u** (pobede → međusobni duel za dvoje → set-razlika → gem-razlika) umesto UUID-a.
- moveEntry: obavezno isti turnir; „Prijavi i u jaču" nudi samo jače kategorije iste discipline.
- Codex nalaz „gost-pobedio-gosta kaskada ne radi" — **opovrgnut testom** (kaskada tačna: obe gostove putanje se obrađuju).
- Test baterija (rollback na produkcionoj bazi): 11 regresionih + 8 novih testova + smoke 19 ruta — sve zeleno. Preostalo iz revizije (sitnica): eksplicitni opt-out za solo bodove (sada: ukloniti prijavu = ne boduje se).

### ✅ Usklađivanje sa starim sajtom + revizija javnog dela (2026-07-18, kasno veče)
Provera parnosti sa teniskiveteranisrbije.com (nav + 5 pravilničkih stranica + FAQ) + druga Codex revizija (javni deo/UX, 14 nalaza).
**Pravila usklađena (migracije 30–31):**
- **Utešni bodovi po kosturu** = bodovi 1. kola ÷ 3 (potvrđeno iz uvezene istorije: s1000 → 60/30/15; s2000 → 120/60/30) — bilo fiksno po seriji.
- **Rang = 13 najboljih** (FAQ starog sajta) — `n_best` 8→13 + preračun.
- **Predaja meča = igrač gubi sve poene turnira** (propozicije); `retiranje` i dalje boduje.
- **Promena kategorije**: samo ka jačoj + jedna odobrena godišnje + starosni minimumi (II≥35 · III≥45 · IV≥50 · V≥60); `/nalog` nudi samo jače + prevedene poruke grešaka.
- **Samoprijava v2**: pravo nastupa (kvalitativna svoja/jača; starosna po godištu), bilo koji aktivan žreb zatvara prijave (i radni), beogradski datum. 6/6 testova.
**Popravke javnog dela (Codex nalazi):** pretraga „Ime Prezime" radi (permutacije), broj turnira na profilu po jedinstvenom turniru, broj učesnika računa i partnere u dublu, kalendar ne gubi turnire bez datuma, beogradski dan umesto UTC (status/particija/SQL), auto-izveštaj u vestima zadržava prelome redova (`whitespace-pre-line`), entry-panel razlikuje „Prijave zatvorene" od „Žreb objavljen" + „Prijavljeni ste" bez lažnog dugmeta za odjavu, direktorijum prikazuje napomenu „prvih 60", sezona u hero-u dinamička.
**Preostali gap prema starom sajtu (backlog po prioritetu):** galerija; FAQ + „brisanje bodova" stranice pravilnika (sadržaj postoji u spec-u); registraciona forma za nove članove (sada magic link samo za postojeće); rang-liste po starosnim kategorijama (podaci postoje, UI nudi samo I–V); paginacija direktorijuma; sankcije za nepojavljivanje (opomena→bodovi→suspenzija — deo disciplinske, Faza 4); H2H na profilu; kalendar filteri (serija/mesec/grad).

### 🧪 Demo nalozi (2026-07-18)
- **Sudija:** `svabic+sudija@gmail.com` (uloga `sudija`, povezan sa neaktivnim igračem „Demo Sudija") · **Koordinator:** `svabic+koordinator@gmail.com` (uloga `koordinator`). Gmail plus-aliasi → magic link stiže u `svabic@gmail.com` inbox; prijava na `/prijava` unosom alias adrese. Rezervna lozinka `TVS-demo-2026` postavljena (UI nema password formu — za slučaj da se doda).
- **DEMO turnir** `demo-obuka-2026` („DEMO turnir — obuka (nije zvaničan)", +30 dana, 3 konkurencije) — sudija mu je Demo Sudija, pa demo sudijski nalog ima šta da vodi. Obrisati pred go-live (i turnir i naloge i igrača `deadbeef-…`).

### 🟢 Sitnice (Faza 6 / pred go-live)
- Obrisati staru zaglavljenu Supabase bazu (support tiket).
- **Pravi domen** na Vercel (sada „test" `project-82ord.vercel.app`) → projekat `veterani_tenis` → Settings → Domains.
- Auth: custom SMTP + Site URL (vidi Fazu 2).

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
| 2026-07-13 | `Faza 1: migracija podataka` | Uvoz 2.831 igrača + 427 klubova + kontakti sa starog sajta |
| 2026-07-13 | `Faza 2: aktivacija naloga` | Magic link prijava + povezivanje naloga sa igračem + session refresh u proxy |
| 2026-07-14 | `Faza 3: žreb engine` | ITF nošenje/bye/predkolo/grupe + 26 testova + javni prikaz žreba |
| 2026-07-14 | `Faza 3: sudijski portal` | Kreiraj/objavi žreb + unos rezultata sa auto-napredovanjem |
| 2026-07-14 | `Faza 3: ZAVRŠI TURNIR` | Bodovne tablice + obračun + nedeljni rang (finish_tournament) |
| 2026-07-14 | `Faza 3: prijave + satnica` | Upravljanje prijavama, satnica po meču (javno), zamena pozicija |
| 2026-07-14 | `Faza 4: koordinatorski panel` | Audit + korekcije (opoziv/poništavanje/reopen) + uloge + novi turnir |
| 2026-07-14 | `Faza 1: istorija` | Uvoz 154 turnira + 6.745 mečeva + bodovi/rang + profil (istorija/mečevi) |
| 2026-07-14 | `Faza 5: PWA + i18n polish` | Instalabilnost (192/512 maskable, apple-icon, theme-color) + proxy fix + EN audit |
| 2026-07-14 | `Kalendar + trofeji` | Predstojeći/arhiva po godinama + pobednici po kategoriji na kartici + pehari na profilu |
| 2026-07-14/15 | `Redizajn Faza 0–7` | Dizajn sistem + nova početna/kalendar/turnir/igrači/profil/rang/statika/portali |
| 2026-07-15 | `Samostalna prijava (singl)` | Inline samoprijava/odjava na stranici turnira + javna lista prijavljenih |
| 2026-07-15 | `Koordinator Faza 4` | Uredive bodovne tablice + dodela sudije + odobravanje promene kategorije (uz audit) |
| 2026-07-16 | `Heroji` | Nove foto slike (glavni veteran + compact letterbox traka) + zatamnjenje |
| 2026-07-16 | `Turniri + kalendar` | Završeni bg + sortiranje konkurencija + 🏆 pobednik + round-robin grupe; kalendar particija po datumu + „Prijavi se" |
| 2026-07-16 | `fix(i18n) not-found` | not-found kao client component (prevodi se razrešavaju) |
| 2026-07-16 | *(bez commita — podaci u bazi)* | Turnir 156 (pun rezultati+bodovi) i 149 (bodovi) sa ref sajta; Vercel framework fix; demo obrisan |
| 2026-07-16 | `Sudijski: unos rezultata` | Strukturisan unos po setovima + auto-fokus + auto-pobednik |
| 2026-07-16 | `Novi turnir + kontakt` | Sudija combobox, klub→mesto autofill, domaćin/kontakt/lokacija, broj učesnika klikabilan |
| 2026-07-16 | `Koordinator mini-admin` | Sudijska uloga, klubovi, članovi/gosti, email adrese (BCC) |
| 2026-07-16 | `Sekretar-paket` | Izmena turnira/igrača, spajanje duplikata, uplate, vesti (CMS v1) |
| 2026-07-16 | `Panel + prijave UX` | Aktivni turniri na vrhu; premeštanje prijave; auto-konkurencije; „Upravljaj" |
| 2026-07-16 | `Žreb: nosioci + bodovi` | Ručne oznake nosilaca; broj nosilaca uvek po kosturu; bodovi u žrebu; satnica default datum |
| 2026-07-16 | `Auto-izveštaj` | „ZAVRŠI TURNIR" objavljuje izveštaj u vestima (pobednici, finale, PF) |
| 2026-07-18 | `Integritet obračuna` | Model B „svi boduju" + validacija tablice + nedeljni cron rang + atomske korekcije |
| 2026-07-18 | `Sudija read-only` | Posle ZAVRŠI TURNIR nema izmena; javna stranica: osvojeni bodovi po konkurenciji |
| 2026-07-18 | `Izveštaj + satnica` | Izveštaj sudije (loptice, sporne) + `/turnir/[slug]/satnica` za štampu |
| 2026-07-18 | `PWA offline` | Servisni radnik (network-first) + offline fallback; verifikovano Playwright-om |
| 2026-07-18 | *(podaci u bazi)* | Test turniri obrisani (+14 bodova, gost); demo nalozi sudija/koordinator + DEMO turnir |
| 2026-07-18 | `Gost bez bodova` | Kaskada plasmana niz kostur; čista grupa samo članovi |
| 2026-07-18 | `Medalje + anchori` | Konkurencije klikabilne → kostur; osvajači medalja po kategoriji |
| 2026-07-18 | `Svak sa svakim` | Štiklir za jednu RR grupu (5–8 igrača) uz Kreiraj žreb |
| 2026-07-18 | `Solo kategorija` | Jedini prijavljeni = pobednik bez borbe; „Prijavi i u jaču" (bodovi u obe) |
| 2026-07-18 | `Revizija Claude+Codex` | guardOpen po entitetu + RLS lock završenog + SW privatnost + finish v5 (tie-break) |

---

## 8. Pokretanje

```bash
pnpm install
cp .env.example .env.local   # Supabase URL + anon ključ (već postavljeno lokalno)
pnpm dev                      # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm build   # pre svakog commita
```
