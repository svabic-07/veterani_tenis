# TVS — Plan implementacije (izrada sajta)

> **Teniski Veterani Srbije** · redizajn informacionog sistema
> Prati dokumente: `TVS-Redizajn-Specifikacija.html` (dizajn i funkcije) i `TVS-Plan-Implementacije.html`
> Jezik komunikacije: **srpski** · Sajt: **dvojezičan** (SR podrazumevano + EN)
> Verzija 1.0 · jul 2026

---

## 0. Konvencije (čitati prvo)

### Izbor modela po fazi
- **Opus** — arhitektura, bezbednost (RLS/RPC), *net-new* dizajn, kritična logika (žreb, bodovanje, integracija).
- **Sonnet** — jasno specifikovan rad: read ekrani, CRUD forme, prevodi, migracione skripte, mehaničke izmene.
- Svaka faza na **vrhu** ima `Model:` (Opus/Sonnet), a na **kraju** `→ Sledeća faza:` sa predlogom modela.

### Dizajn — radi se PRVO
- **Claude Design** → UI i dizajn sistem (boje, tipografija, komponente, ekrani) **pre kodiranja**.
- **Slike** → generišu se u **ChatGPT-u**; **Claude piše promptove** za slike i ostali sadržaj.
- **Mobile-first (web)** → dizajn prvo za telefon, pa naviše; sudijski portal mora biti **odličan na mobilnom** (rad na terenu).
- Tok slike: `Claude napiše prompt → slika u ChatGPT-u → ubacuje se u sajt`.

### Deploy
- Na **kraju svake faze → deploy na Vercel** (preview po PR-u; produkcija u Fazi 6).

---

## 1. Principi

1. **Bolji od postojećeg.** Moderan UI, mobilni rad, dvojezičnost, dubl/miks, live status, automatski obračun.
2. **Sve ispravljivo uz audit — osim integriteta žreba.** Što postojeća app zaključava (rezultati, status turnira) kod nas je ispravljivo, ali **svaka izmena se beleži** (`audit_log`). Struktura žreba se menja samo kontrolisanim, zabeleženim opozivom.
3. **Žreb prati pravila** (ITF nošenje, bye, hibrid „grupa od 5").
4. **Dva bodovna modela** — bira **Koordinator** po turniru/seriji/sezoni.
5. **Koordinator = takmičarski autoritet** (sve takmičarske odluke). **Admin = tehnička uloga** (sistem, bez takmičarskih odluka).
6. **Odvojene baze.** Veterani = sopstvena Supabase + Next.js (razdvojivo). CourtNomad koristi veteransku bazu preko kontrolisanog, opozivog pristupa.

---

## 2. Tehnologija

| Sloj | Izbor |
|---|---|
| Front | **Next.js** (App Router, RSC, Server Actions), TypeScript |
| Baza/Auth | **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions), RLS + SECURITY DEFINER RPC |
| Hosting | **Vercel** (preview po PR-u, CDN; domen kasnije) |
| i18n | **next-intl** — rute `/[locale]/`, SR default + EN |
| UI | **Tailwind + shadcn/ui**, dizajn sistem iz Claude Design |
| Podaci (klijent) | **React Query** (keš + optimistični update na terenu) |
| PWA | „instaliraj na ekran", offline-tolerantan unos |
| CI/CD | typegen iz Supabase, lint/test/typecheck, verzionisane migracije |

---

## 3. Model podataka + migracija

### Ključne nove/proširene tabele (povrh ERD-a iz specifikacije)

```sql
-- sezona: koordinator zadaje N i podrazumevani bodovni model
seasons(id, naziv, n_best int /* 8|10|13 */, default_scoring enum, aktivna bool)

-- turnir bira bodovni model (nasleđuje od sezone, može override)
tournaments(… , scoring_model enum('klasicni','svi_boduju'),
            status enum('najava','prijave','zreb','u_toku','zavrsen','ponovo_otvoren'))

-- žreb: zaključavanje + izvor nošenja, radi integriteta
draws(… , locked bool, locked_at ts, seed_source jsonb /* rang na dan žreba */)

-- tablice bodova kao podatak (po modelu/seriji/kosturu/kolu)
scoring_tables(id, model enum, serija, kostur, kolo, bodovi int)

-- SVE izmene se beleže (editabilnost = bezbedna)
audit_log(id, entitet, entitet_id, akcija, staro jsonb, novo jsonb, ko uuid, kada ts)
```

### Redosled migracije (baza se dobija od **aktuelnog sajta**)
1. Šifarnici: klubovi, kategorije, serije, sezone.
2. Igrači (~2.600) + uloge; čuvati **stari ID** radi povezivanja.
3. Istorija turnira i rezultata → bodovi.
4. Preračun rang lista i **validacija** prema postojećim.

### Pravila migracije
- Idempotentne skripte (ponovljive bez duplikata).
- Validacija: broj igrača, zbir bodova i top rang po kategoriji = isti kao na starom sajtu.
- JMBG enkriptovan, nije javan.
- Izveštaj o nepodudaranjima pre „go-live".

---

## 4. Žreb engine (po pravilima)

1. **Učesnici:** prijavljeni po kategoriji/disciplini, sortirani po rang bodovima (prikaz: bodovi + broj turnira).
2. **Broj nosilaca (ITF):** žreb 8 → **2**, 16 → **4**, 32 → **8**, 64 → **16**, 128 → **32**. Round-robin: 6–7 → 2, 3–5 → 0.
3. **Nošenje:** auto-predlog po rangu (na dan zatvaranja prijava) + **ručna izmena**. Nerangirani se ne nose (osim „seed exempt" koje odobri koordinator).
4. **Raspored:** N1 → vrh (linija 1), N2 → dno; N3–4 u različite četvrtine; N5–8 u osmine; razdvajanje istog kluba/države.
5. **Bye-ovi:** manjak igrača → bye nosiocima po opadajućem redu (najjači prvo), ostatak žrebom.
6. **Grupa od 5 (hibrid):** rang 3–4–5 round-robin (3 meča) → prva dvojica u PF (2. iz grupe vs N1, 1. iz grupe vs N2).
7. **Zaključavanje:** po kreiranju žreb se zaključa (snimi se izvor nošenja). Izmena samo kroz koordinatorski **opoziv uz audit**.
8. **Dubl/miks:** nošenje po zbiru bodova para; par s nerangiranim igračem ide ispod parova s istim bodovima.

> **Integritet:** žreb je jedina stvar koja se ne menja slobodno. Posle zaključavanja — samo koordinatorski opoziv/ponovni žreb, zabeležen u `audit_log`.

---

## 5. Bodovni modeli (opcija Koordinatora)

| Model | Opis |
|---|---|
| **A · Klasični (napredovanje)** | Bodovi po dostignutom kolu (tabela po kosturu × seriji). Poraz u 1. kolu = mali „utešni" bodovi. **Podrazumevani.** |
| **B · „Svi dobijaju bodove" (Master-stil)** | Svaki učesnik osvaja bodove i bez pobede. Nagrađuje učešće. |

**Model B — vrednosti:** pobednik **800**, finale **600**, polufinale **400**, pobeda u grupi **200**, bez pobede **500**, rezerva **200**.

- **Gde se bira:** Koordinator (default na nivou sezone, override po turniru/seriji).
- **Kada se računa:** na „ZAVRŠI TURNIR" engine primeni izabrani model i upiše bodove.
- **Ponovni obračun:** ako se turnir ponovo otvori ili ispravi rezultat — bodovi se preračunaju (idempotentno, u audit-logu).
- **Rang lista:** zbir **N najboljih** (N = 8/10/13, zadaje koordinator po sezoni) iz aktivnih (poslednjih 52 nedelje); nedeljni obračun (Supabase cron/edge).

---

## 6. Editabilnost (matrica korekcija)

| Entitet | Ko menja | Do kada | Napomena |
|---|---|---|---|
| Prijave | Igrač / Sudija / Koordinator | Do roka (+ koordinator i posle) | Ručno dodavanje gosta/stranca |
| Nosioci | Sudija / Koordinator | Pre kreiranja žreba | Posle žreba — samo kroz opoziv |
| **Žreb (struktura)** | **Samo Koordinator** | Opoziv uz audit | 🔒 Zaštićen integritet |
| Satnica | Sudija / Koordinator | Sve vreme (uz audit) | Po igraču i/ili po terenu |
| Rezultat meča | Sudija / Koordinator | I posle unosa | Auto re-propagacija + preračun |
| Bodovi / rang | Koordinator | Bilo kada | Ručna korekcija / brisanje |
| Status „završen" | Koordinator | „Ponovo otvori" | Vraća i preračunava bodove |
| Profil / kategorija | Igrač (zahtev) / Koordinator (odobri) | Bilo kada | Promena kategorije = odluka koordinatora |
| Uplate (evidencija) | Sudija / Koordinator | Bilo kada | Bez online naplate |

> **Pravilo:** sve menjivo što ne narušava integritet — uz obavezan audit zapis (ko, šta, kada, staro→novo).

---

## 7. Uloge i prava (RBAC + RLS)

| Mogućnost | Gost | Igrač | Sudija | Koordinator | Admin (teh.) |
|---|:--:|:--:|:--:|:--:|:--:|
| Javni pregled | ✓ | ✓ | ✓ | ✓ | ✓ |
| Prijava/odjava, svoj profil | — | ✓ | ✓ | ✓ | — |
| Svoj turnir: žreb/satnica/rezultat | — | — | ✓ | ✓ | — |
| Opoziv žreba, ispravka rezultata, „ponovo otvori" | — | — | — | **✓** | — |
| Kalendar/turniri, dodela sudija, kategorije, disciplina | — | — | — | **✓** | — |
| Bodovni model, tablice, obračun ranga, korekcije bodova | — | — | — | **✓** | — |
| Nalozi/uloge, migracija, integracije, CMS, backup | — | — | — | — | **✓** |

Sprovođenje: RLS po tabeli (vlasništvo reda) + **SECURITY DEFINER RPC** za sve mutacije; koordinatorske radnje proveravaju ulogu i upisuju u `audit_log`. Klijent koristi anon ključ (nikad service-role).

---

## 8. FAZE IZRADE

### Faza 0 — Temelj + dizajn · `~2 ned.` · **Model: Opus**
**Cilj:** postaviti temelj i **završiti dizajn pre kodiranja**.
**Zadaci:**
- [ ] Repo + okruženja: Next.js app, Supabase (veteranski, odvojen), Vercel; `.env` tajne; dev/staging/prod.
- [ ] **Dizajn (Claude Design):** dizajn sistem (boje, tipografija, komponente), ključni ekrani, **mobile-first**.
- [ ] **Slike:** Claude piše promptove → generisanje u ChatGPT-u → ubacivanje (hero, pozadine, ilustracije).
- [ ] i18n skelet (SR default + EN), prekidač jezika.
- [ ] Auth + RBAC enum (gost/igrač/sudija/koordinator/admin) + RLS skelet.
- [ ] Typegen iz Supabase + CI (lint/test/typecheck), šablon migracija.

**Gotovo kada:** okruženja rade, dizajn sistem usvojen, tipovi sinhronizovani, prijava radi po ulozi, RLS čita bezbedno.
**Deploy:** 🚀 Vercel (preview).
**→ Sledeća faza:** **Sonnet** (read ekrani + migracione skripte).

---

### Faza 1 — Migracija + javni sajt · `~3–4 ned.` · **Model: Sonnet**
**Cilj:** preuzeti podatke i pustiti javni sajt (na pregled).
**Zadaci:**
- [ ] **Migracija baze igrača i rezultata — od aktuelnog sajta** (šifarnici → igrači → istorija → bodovi).
- [ ] Validacija migracije (broj igrača, zbir bodova, top rang = isti).
- [ ] Javni ekrani: kalendar turnira (filteri), stranica turnira (read), profili igrača, direktorijum članova, rang liste.
- [ ] Dizajn-pas za javni deo (mobile-first) pre kodiranja.
- [ ] Pravilnik/propozicije/FAQ (CMS sadržaj), SEO.

**Gotovo kada:** migrirana baza validirana, javni sajt uživo na pregled, odličan na mobilnom.
**Deploy:** 🚀 Vercel.
**→ Sledeća faza:** **Sonnet** (CRUD/forme).

---

### Faza 2 — Igrački portal · `~2–3 ned.` · **Model: Sonnet** *(Opus za Auth/RLS deo)*
**Cilj:** član sve radi sam.
**Zadaci:**
- [ ] Auth + migracija postojećih naloga, reset lozinke.
- [ ] Profil (lični podaci, klub, foto), zahtev za promenu kategorije.
- [ ] Prijava/odjava na turnire (do roka), izbor kategorije i discipline.
- [ ] Partneri za dubl/miks (poziv + potvrda).
- [ ] Status uplata (evidencija), izjava o odgovornosti.
- [ ] Dizajn-pas za igrački portal.

**Gotovo kada:** član se samostalno prijavljuje/odjavljuje i vidi svoje bodove.
**Deploy:** 🚀 Vercel.
**→ Sledeća faza:** **Opus** (žreb i bodovni engine — kritično).

---

### Faza 3 ★ — Sudijski portal · `~3–4 ned.` · **Model: Opus**
**Cilj:** vođenje turnira od žreba do finala, na telefonu.
**Zadaci:**
- [ ] **Žreb engine po ITF** (auto-nošenje + ručna izmena, bye, grupa od 5), zaključavanje + izvor nošenja.
- [ ] Satnica (po igraču + opciono po terenu/meču), štampanje, izmena uz audit.
- [ ] Unos rezultata po setovima + **auto-napredovanje** kroz bracket; walkover/predaja/retiranje; varijante formata.
- [ ] „ZAVRŠI TURNIR" → obračun bodova (po izabranom modelu).
- [ ] Evidencija loptica + izveštaj koordinatoru; prijava spornih situacija.
- [ ] **Mobile-first** UX za rad na terenu; PWA/offline-tolerantno.
- [ ] Dizajn-pas za sudijski portal.

**Gotovo kada:** turnir se vodi od žreba do finala na telefonu; rezultati hrane rang.
**Deploy:** 🚀 Vercel.
**→ Sledeća faza:** **Opus** (bodovni modeli, korekcije, audit).

---

### Faza 4 — Koordinatorski panel + obračun · `~3 ned.` · **Model: Opus**
**Cilj:** koordinator vodi celo takmičenje i ispravlja greške bez programera.
**Zadaci:**
- [ ] **Dva bodovna modela** (klasični + „svi dobijaju bodove"), uređive tablice (`scoring_tables`).
- [ ] Obračun rang liste (N po sezoni, 52 nedelje), zamrzavanje/pokretanje.
- [ ] **Korekcije uz audit:** ispravka rezultata (re-propagacija), opoziv/ponovni žreb, „ponovo otvori turnir".
- [ ] Članovi i kategorije (odobravanje/promena), klubovi, kalendar i turniri, dodela sudija.
- [ ] Evidencija uplata; disciplinska komisija (opomene/kazne/isključenja).
- [ ] **Tehnički admin:** nalozi/uloge, prevodi (SR/EN), integracije, backup, audit-log.

**Gotovo kada:** koordinator vodi celo takmičenje i ispravlja greške bez programera.
**Deploy:** 🚀 Vercel.
**→ Sledeća faza:** **Sonnet** (prevodi, dorade).

---

### Faza 5 — Engleski + dorade + PWA · `~2 ned.` · **Model: Sonnet**
**Cilj:** dvojezično, brzo, ispolirano.
**Zadaci:**
- [ ] Kompletan **EN prevod** (ceo javni deo + igrački portal).
- [ ] Galerija; PWA/offline; optimizacije performansi.
- [ ] Finalni dizajn-polish + **mobile QA**.
- [ ] E2E testovi ključnih tokova (prijava → žreb → rezultat → obračun).

**Gotovo kada:** dvojezično, brzo, prolaze E2E testovi.
**Deploy:** 🚀 Vercel.
**→ Sledeća faza:** **Opus** (integracija/bezbednost).

---

### Faza 6 — Integracija + domen + produkcija · `~2 ned.` · **Model: Opus**
**Cilj:** produkcija + povezivanje s CourtNomad-om.
**Zadaci:**
- [ ] Kontrolisan pristup CourtNomad-a veteranskoj bazi (ograničena role/ključ ili integracioni API).
- [ ] Povezivanje naloga (CourtNomad ↔ veteranski član — verifikacija/„preuzmi profil").
- [ ] Domen na Vercel; backup pre go-live; provera migracije.
- [ ] Go-live + **obuka direktora/koordinatora**.

**Gotovo kada:** sistem u produkciji, CourtNomad čita/zapisuje preko kontrolisanog pristupa, obuka održana.
**Deploy:** 🚀 **Produkcijski deploy + domen**.
**→ Održavanje:** **Sonnet** (rutinske izmene), **Opus** po potrebi (veće promene).

---

## 9. Integracija sa CourtNomad-om (Faza 6)

- **Odvojene baze i Next.js aplikacije.** Veterani = izvor istine; CourtNomad **koristi veteransku bazu** preko kontrolisanog, **opozivog** pristupa.
- **Način (za dogovor):** ograničena role/ključ na veteranskoj bazi (preporuka) **ili** zaseban integracioni API (čistija granica).
- **Povezivanje naloga:** CourtNomad korisnik „preuzme" svoj TVS profil (mapiranje CN ↔ veteranski član).
- **Razdvojivost:** opoziv pristupa = trenutno razdvajanje; veterani nikad ne zavise od CourtNomad-a.

---

## 10. QA, deploy, rizici

**Testiranje:** jedinični testovi za žreb i bodovanje; **E2E tok turnira**; validacija migracije.
**Deploy:** Vercel preview po PR-u, staging baza; produkcija po prolasku testova.
**Rollback:** verzionisane migracije, backup pre go-live, `audit_log` za rekonstrukciju.

| Rizik | Ublažavanje |
|---|---|
| Pogrešan obračun bodova (2 modela) | Testovi po modelu; idempotentan preračun; audit; ručna korekcija koordinatora |
| Greška u žrebu na terenu | Koordinatorski opoziv uz audit; ručna izmena pre zaključavanja |
| Neusklađena migracija | Validacioni izveštaj pre go-live; čuvanje starih ID-jeva |
| Slaba mreža na terenu | PWA/offline-tolerantan unos, sinhronizacija kasnije |
| Razdvajanje od CourtNomad-a | Odvojene baze + opoziv pristupa |

---

## 11. Otvorena pitanja (za potvrdu)

- [ ] Pristup **bazi** aktuelnog sajta radi migracije (format/izvoz).
- [ ] Pune **tablice bodova** za oba modela (vrednosti po kosturu/seriji).
- [ ] Da li **strani gosti** osvajaju bodove za TVS rang ili igraju van konkurencije.
- [ ] Način integracije s CourtNomad-om (ograničen ključ vs API) + povezivanje naloga.
- [ ] Članarina (1500 din) — samo evidencija ili i potvrda; **domen**.

---

*Pratite i `TVS-Redizajn-Specifikacija.html` (dizajn, portali, baza) i `TVS-Plan-Implementacije.html` (vizuelni plan).*
