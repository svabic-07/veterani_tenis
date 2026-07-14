# TVS — Master prompt za Claude (dizajn + klikabilni mockup svih stranica)

> Nalepi ceo ovaj dokument u Claude (Artifacts/Design). On je pisan na osnovu **stvarno izgrađenog sistema** (ne pretpostavki): tačni dizajn tokeni, prava baza podataka, stvarne stranice i tokovi. Cilj: mockup koji izgleda kao najbolji teniski sajt na svetu — a namenjen je veteranima.

---

## 0. Šta praviš (u jednoj rečenici)

Zvanični digitalni dom **Teniskih Veterana Srbije (TVS)** — javni sajt + tri radna portala (igrački, sudijski, koordinatorski/admin) nad jednom bazom, dvojezično (SR podrazumevano, EN), mobile-first. Model: **ITF World Tennis Masters Tour**, ali toplije, lokalnije, brže i razumljivije za amatere.

**North star:** svaki korisnik, za 3 sekunde, na telefonu, na suncu, dobije sledeću korisnu informaciju — *gde igram, kada, protiv koga, kakav je žreb, koliko imam bodova, šta je sledeći korak.* Lepota dolazi posle jasnoće, ali kad dođe — mora da obara s nogu.

**Merilo uspeha:** čovek od 62 godine koji nije „za kompjutere" koristi sajt bez obuke; direktor unosi rezultat jednom rukom pored terena; a stranac koji slučajno naiđe pomisli „ovo je ozbiljna teniska organizacija".

---

## 1. Realno stanje sistema (dizajniraj za OVO, ne za prazan starter)

Ovo nije koncept — sistem postoji i pun je pravih podataka. Mockup mora da izgleda kao da je popunjen stvarnim sadržajem:

- **2.896 igrača** u direktorijumu (pravi ljudi, srpska imena sa dijakriticima: Đukelić, Mandžukić, Ćirović…).
- **154 odigrana turnira** (istorija 2018–2026), **6.745 mečeva** sa rezultatima po setovima, **8.412 setova**.
- **Rang liste popunjene** — npr. Miloš Đukelić, kat. I singl, **4980 bodova iz 8 turnira, #1**.
- **Trofeji** po igraču (npr. 🥇7 · 🥈3 · 🥉3), pobednici po kategoriji vidljivi na svakoj kartici turnira.
- Turniri se vode kroz sistem od **prijava → žreb → rezultati → obračun bodova → rang**.

Tehnologija koju dizajn mora poštovati (utiče na komponente, ne na maštu): Next.js App Router, Tailwind v4 tokeni, Supabase, magic-link prijava (**bez lozinke**), server-renderovan javni deo. RSC znači: statične, brze, SEO-friendly javne stranice; portali su interaktivni.

---

## 2. Avatar — ko zaista koristi ovaj sajt

Dizajniraj za ove ljude poimence. Svaki ekran testiraj kroz njihove oči.

### 🎾 Veteran igrač (PRIMARNA publika, 80% saobraćaja)
Amaterski i bivši takmičarski teniseri, **20–90 godina**, težište 45+. Imaju posao, porodicu, obaveze. Igraju **ozbiljno vikendom** — takmičarski integritet im je važan, ali nisu profesionalci. Većina gleda **telefon, napolju, na jakom suncu**, često između mečeva. Deo njih **nije digitalno napredan** — sitan tekst, skriveni meniji i višekoračni tokovi ih odbijaju.

Šta hoće, redom po važnosti: *Kad je sledeći turnir i do kad je prijava? Da se prijavim bez cimanja. Da vidim žreb čim izađe. Kad i na kom terenu igram i protiv koga? Koliko imam bodova, kako sam prošao, gde sam na rang listi? Profil protivnika i međusobni skor. Pravila i kategorije.*

Posledice po dizajn: **veliki tekst i touch-targeti (min 44px), visok kontrast za sunce, monospaced brojevi (rezultat/vreme/bodovi/rang) da se čitaju iz oka, „sledeća akcija" uvek iznad pregiba.**

### ⚖️ Direktor turnira / sudija (kritičan radni alat, mobilni)
Vodi turnir **na terenu, pod pritiskom, jednom rukom na telefonu**. Hoće: prijave po konkurenciji, napravi žreb i objavi, **unese rezultat za < 20 sekundi**, promeni satnicu kad se teren oslobodi, završi turnir. Greška u rezultatu ili žrebu = ozbiljan problem. Mora jasno da razlikuje **radna verzija / objavljeno / zaključano**, i da destruktivne akcije traže potvrdu.

### 🛠️ Koordinator (takmičarski autoritet, gust back-office)
Vodi celu sezonu: kreira turnire, dodeljuje direktore i uloge, **ispravlja greške bez programera** (poništi rezultat, opozovi žreb, ponovo otvori turnir — sve uz **audit**), drži bodovne tablice pod kontrolom, vidi probleme (nedovršeni turniri, nerešeni mečevi, duplikati igrača). Njemu **preciznost > lepota**: gusta ali čitljiva tabela, kontekst posledica, potvrde.

### 🔧 Tehnički admin
Nalozi, uloge, povezivanje profila, auth/migracioni problemi, CMS/prevodi, backup. Jasno odvojen od koordinatora: **admin održava sistem, koordinator vodi takmičenje.**

---

## 3. Dizajn teza i reference

**Teza:** „šljaka, teren, loptica, mreža, rang tabela" — topao klupski identitet spojen sa preciznošću zvaničnog takmičarskog sistema. Ne generički SaaS dashboard, ne dečja teniska akademija, ne hladan korporativni sport.

**Iz ITF-a (World Tennis Masters Tour je naš direktan uzor) uzmi:**
- **Više ulaznih tačaka po nameri:** *Kalendar* (šta dolazi) / *Rezultati & žrebovi* (šta je bilo) / *Rang liste* / *Igrači* — kao ravnopravni, jasni putevi, ne zakopani u jedan meni.
- **Jedan konsolidovan kalendar** sa filterima po kategoriji/seriji/gradu/statusu (ne 6 odvojenih kalendara kao ITF — mi smo manji, jedan je jači).
- **Kartice kao mreža ravnopravne težine** za module i turnire.
- **Footer kao mapa celog sistema** (kredibilitet zvanične organizacije).
- **Institucionalan ali pristupačan ton**, tipografija velika i čitljiva, brojke u prvom planu.
- **Rang liste kao primarna ulazna tačka**, live/results orijentacija.

**NE preuzimaj iz ITF-a:** stock fotografije profesionalaca i stadiona, hladan globalni korporativni izgled, duboku 8-nivo navigaciju. TVS je lokalniji, topliji, sa šljakom i vikend-turnirima — a opet ozbiljan.

---

## 4. Brend i dizajn sistem (koristi TAČNO ove vrednosti)

Ovo su stvarni tokeni iz `globals.css`. Predloži fine dorade, ali ostani veran paleti i sportskom identitetu.

### Boje
```
Brend
  clay        #C8553D   (šljaka — PRIMARNA akcija, dugmad, akcenti)
  clay-dark   #9E3B28   (hover)
  clay-soft   #E8917A
  court       #2F6E4F   (teren — pozitivno/aktivno/pobeda, „ovo sam ja", zeleni statusi)
  court-dark  #1F4C36
  court-soft  #5FA37E
  ball        #D6E84B   (loptica — ISTICANJE bitnih statusa i tačkica, NIKAD dominantna površina)
  ball-deep   #B7CC2E

Neutralne / mastilo
  navy        #15233A   (header, hero podloga, naslovi)
  ink         #1B2A41   (telo teksta)
  slate       #46566C   (sekundarni tekst)
  muted       #7A879B   (tercijarni/labels)

Površine (tople, ne bele)
  bg          #F7F3EC   (pozadina — krem, ne belo)
  bg2         #EFE8DD   (sekundarna traka)
  card        #FFFFFF   (kartice/tabele)
  line        #E6DED1   (tanke granice)
  line2       #D9CFBE   (jače granice)

Statusi
  ok  #2F8F5B    warn #D98A1F    bad #C8413B    info #3B6FB0
```

**Pravila upotrebe boje:** clay = radnja/akcenat; court = uspeh/aktivno/„moje"; ball = samo za sitno isticanje (tačkica u eyebrow-u, live indikator, ključni badge) — nikad kao velika površina; navy = autoritet (header/hero/naslovi); krem pozadina + bele kartice = toplina i čitljivost napolju.

### Tipografija
- **Display: Sora** (naslovi, brojevi u hero-u, imena) — extrabold, tight tracking, line-height ~1.15.
- **Body: Inter**, line-height 1.62.
- **Mono: JetBrains Mono** — OBAVEZNO za **datume, vreme, rezultate (6:3 7:5), bodove, rang (#1), kostur žreba, tabele**. To je potpis sistema — brojke deluju „takmičarski/tabelarno".
- Skala (desktop): H1 44–56 / H2 28–34 / H3 18–20 / body 16 / small 13–14. Mobilno: H1 32–36. Eyebrow: 12px uppercase, tracking 0.13em.

### Forma i osećaj
- Radijusi: **10 / 16 / 26 px**. Kartice 16, čipovi/badge pill, veliki paneli 26.
- Senke: suptilne, tople (`0 6px 24px rgba(20,35,58,.09)`). Bez teških drop-shadow-a.
- **Potpisni hero:** navy gradijent (`135deg #16263E → #13314A → #1C5340`) sa dva radijalna sjaja — ball žuti gore-desno (nisko, ~20% alfa) i clay levo (~40% alfa). Iznad: eyebrow sa **ball tačkicom**, ogroman Sora naslov, lead, dva CTA (clay pun + staklo), pa **traka statistike** (mono brojevi na tankoj liniji).
- **Bez** preteranih gradijenata drugde, bez glassmorphism svuda, bez dekorativnih ilustracija. Fotografije — ako ih ima — realne (šljaka, klupski tereni, veterani), toplo obrađene; nikad stock profesionalci.
- Ikone: tanke linijske (stroke ~2), diskretne. Loptica kao motiv (žuti krug) — koristi umereno.

### Motion
Suptilno i funkcionalno: hover diže karticu 1–2px + toplija senka; tab/segment prelaz gladak; live indikator pulsira (ball); skeleton umesto spinnera. Ništa što usporava ili ometa čitanje napolju.

---

## 5. Informaciona arhitektura (ITF-inspirisano, pojednostavljeno)

**Globalni header (javni):** logo TVS · **Kalendar · Rang liste · Igrači · Pravilnik · Vesti** · [SR/EN] · **[Prijava / Moj nalog]** (clay). Mobilno: hamburger sa istim redom + veliki CTA.

**Footer = mapa sistema** (3–4 kolone): *Istraži* (Kalendar, Rang liste, Igrači, Vesti) · *Nalog* (Prijava igrača, Sudijski portal, Pravilnik) · *Informacije* (O savezu, Kontakt) · pa red sa © + „Next.js · Supabase · Vercel" + jezik.

**Zone i rute (stvarne):**
- **Javno:** `/` · `/kalendar` (+`?god=` arhiva) · `/turnir/[slug]` · `/igraci` · `/igraci/[id]` · `/rang-liste` · `/pravilnik` · `/vesti` · `/o-savezu` · `/kontakt`
- **Igrač:** `/prijava` (magic link) · `/nalog` (povezivanje sa igračem, moji podaci, sledeći meč, moji bodovi) · prijava na turnir
- **Sudija:** `/sudija` (moji turniri) · `/sudija/[slug]` (prijave, žreb, satnica, rezultati, ZAVRŠI TURNIR)
- **Koordinator/Admin:** `/koordinator` (turniri CRUD, uloge, audit, korekcije, članovi, bodovne tablice, uplate, disciplina, CMS)

---

## 6. Ekrani — brief po ekranu (sa STVARNIM sadržajem i stanjima)

Za svaki: **desktop + mobilno**. Sudijski portal radi **mobile-first, detaljno**. Popuni realnim srpskim podacima (imena, klubovi, datumi, rezultati odozgo).

### A. JAVNI SAJT

**1. Početna** — izlog.
- Potpisni hero (gore). Eyebrow „Sezona 2026", naslov u stilu „Zvanični dom teniskih veterana Srbije", lead, CTA *Kalendar* + *Rang liste*. Statistika: `2.896 igrača · I–V + 20–90 kat. · 4 serije + Master · 3 discipline`.
- **„Naredni turniri"** — 3 kartice (serija badge, datum mono, naziv, klub·grad). Prazno stanje ako nema.
- **„Rang liste — vrh"** — mini tabela top 5 (kat. I singl): #, ime, klub, bodovi. CTA na pune liste.
- **„Istraži sistem"** — 4 kartice modula (Kalendar, Profili igrača, Sudijski portal, Pravilnik) sa kratkim opisom.
- **Vesti/obaveštenja** — kompaktna traka najnovijih (ako ima).

**2. Kalendar** — dve sekcije:
- **„Predstojeći turniri"** (najavljeni/aktivni): kartica = datum (mono) · serija badge · sistem · naziv · domaćin · **status badge** (Najava / Prijave otvorene / Žreb / U toku / Završen / Ponovo otvoren) · rok prijave. Prazno stanje: „Trenutno nema najavljenih turnira. Pogledajte arhivu ispod."
- **„Arhiva"** — **izbor godine** (pill dugmad 2026…2018, aktivna = navy). Kartice završenih turnira te godine sa **🏆 pobednicima po kategoriji direktno na kartici** (npr. `🏆 I M. Đukelić · 🏆 II S. Rajković · 🏆 III G. Džodžo`). Ovo je ključni „wow" — vidiš šampione bez ulaska.
- Filteri (predstojeći): serija, sistem, grad, disciplina. Mobilno: filteri dostupni bez zakopavanja; kartice pune širine.

**3. Stranica turnira** `/turnir/[slug]` — potpisni mini-hero (serija + status badge, naziv, datum·klub·grad, ← Kalendar).
- Tabovi: **Žreb · Satnica · Prijavljeni · Rezultati**.
- **Satnica** (ako objavljena): sortirana lista `vreme(mono) · teren badge · igrač — igrač · kat/disc`.
- **Žreb — po konkurenciji** (kat × disc): **eliminacioni bracket** (kolone: 1. kolo → četvrtfinale → polufinale → finale; horizontalni skrol na telefonu unutar svog okvira, telo se ne prelama), **grupe** (round-robin), **predkolo**. Meč-kartica: dva igrača, nosilac `[1]`, rezultat po setovima (mono), pobednik podebljan/court, bye, live status. Prikaz kostura (`kostur 16 · 4 nosioca`).
- Info blok (desna kolona): serija, sistem, datumi, domaćin, direktor, rok prijave.
- Prazno: „Žreb, satnica i rezultati biće dostupni kada direktor otvori turnir."

**4. Igrači (direktorijum)** — pretraga po imenu + filter kategorije (I–V). Rezultat: mreža kartica (inicijali-avatar u court krugu, ime, klub, kategorija, država ako ≠ RS) + brojač („264 igrača"). Mobilno: pune kartice, pretraga sticky. Uzorak imena: Petar Ajdinović, Goran Aleksić, Zlatan Arifović…

**5. Profil igrača** `/igraci/[id]` — **ovo mora da blista** (kao ITF player profile, ali toplije):
- Hero red: veliki inicijali-avatar (court krug), ime (Sora), klub · kategorija. **Ispod imena: sažetak medalja `🥇 7 · 🥈 3 · 🥉 3`.**
- Leva kolona: info (klub, država, godište+uzrast, ITF IPIN ako ima).
- Desna kolona (redom): **Trofeji** (lista plasmana 1/2/3: medalja + turnir link + kategorija + godina) → **Rang i bodovi** (po kat×disc: `#1 · Kategorija I · Singl · 4980 bodova · 8 turnira`) → **Istorija turnira** (naziv link, datum, kat/disc, `+bodovi`) → **Poslednji mečevi** (P/I badge, protivnik link, turnir, rezultat mono `6:3 7:5` ili `w.o.`).
- Dodaj (dizajn placeholder, podaci kasnije): **mini graf kretanja ranga (↑↓)** i **H2H** blok.

**6. Rang liste** — segmentne kontrole: **disciplina** (Singl/Dubl/Miks) × **kategorija** (I·II·III·IV·V + starosne 20…90). Tabela: `# · Igrač (link) · Klub · Bodovi(mono) · Turnira · ▲▼ promena`. Objašnjenje obračuna (zbir N najboljih u 52 nedelje). **Mobilno: tabela → kartice** (rang veliki levo, ime, bodovi mono desno). Prazno stanje po kombinaciji.

**7. Pravilnik** — strukturisan, dvojezičan. Sticky sadržaj/TOC levo (desktop). Sekcije kao kartice: **kvalitativne kategorije I–V** (tabela: oznaka, naziv, opis), **starosne 20–90**, **serije i format meča** (2000/1000/500/250 + Master), **bodovanje** (tablica po kosturu/kolu — primer žreb od 32), **nošenje (ITF Reg. 35–38)**, **dva modela bodovanja**. Brza pretraga.

**8. Vesti / obaveštenja** — zvanično, kompaktno. Prioritet obaveštenjima koja utiču na sezonu (rok prijave, objava žreba). Ne blog-magazin. Kartica: datum, naslov, kratak izvod, tip (Obaveštenje / Vest).

**9. O savezu** — kratko, toplo, kredibilno: ko su TVS, sistem kategorija i serija, statistika (`~2.900 igrača · 5+11 kategorija · 4+1 serije`). **10. Kontakt** — email, sajt, poziv da se jave koordinatoru kluba; napomena da su podaci privremeni pred lansiranje.

### B. IGRAČKI PORTAL (mobile-first)

**11. Prijava** `/prijava` — **bez lozinke**: „Unesite email → poslaćemo link za prijavu." Veliki input, jedno dugme. Stanje „📬 Proverite email" sa jasnim uputstvom (može u Spam, link ističe). Poruka za starije: „Prvi put? Isto — ako je email u bazi, nalog se sam poveže sa vašim profilom." Blok pomoći: „Nemate email u bazi? Javite se koordinatoru kluba."

**12. Moj nalog** `/nalog` — ako email odgovara **jednom** igraču: kartica „Vaš igrački profil" + link. Ako **više** (deljeni klupski email): picker „Ko ste vi?" sa listom. Ako nema poklapanja: uputstvo. Plus: **sledeći meč** (kad postoji: teren/vreme/protivnik), **moj rang**, **otvorene prijave**, odjava.

**13. Prijava na turnir** — izbor turnira → konkurencije (kat × disc) → singl/dubl/miks; za dubl/miks **izbor partnera**. Potvrda + status. Jasna greška ako je **rok prošao**. (Napomena: koordinator sme prijaviti igrača u njegovo ime — predvidi taj tok.)

**14. Moji mečevi / 15. Moji bodovi** — budući mečevi + prethodni rezultati (filter turnir/disciplina); bodovi po turniru, **šta ulazi u N najboljih**, šta uskoro **ispada iz 52 nedelje**.

### C. SUDIJSKI PORTAL (⚖️ mobile-first, srce sistema — najdetaljnije)

**16. Lista turnira sudije** `/sudija` — turniri koje vodi (staff vidi sve; direktor svoje). Kartica: naziv, datum, mesto, **status + upozorenja** (npr. „3 nerešena meča", „radni žreb"). Link ka koordinatorskom panelu ako je staff.

**17. Turnir — sudija** `/sudija/[slug]` — po konkurenciji, sve na jednom, palcem dostupno:
- **Prijave**: lista (klub + bodovi za nošenje), **pretraga + „Dodaj"**, „Ukloni" (dok žreb nije objavljen).
- **Kreiraj žreb** (≥3 prijave) → **radni žreb** jasno označen „RADNA VERZIJA" → **Objavi** / **Poništi** / **Ponovi žreb**. **Zamena pozicija** (dva selecta → Zameni) u eliminacionom žrebu.
- **Unos rezultata** — po meču: **veliki radio pobednik**, tekst `6:3 7:5`, status (Regularno/Walkover/Predaja/Retiranje), „Sačuvaj". Auto-napredovanje. Potvrda mora reći posledicu: **„Pobednik prošao u polufinale."**
- **Satnica**: termin (datetime) + teren po meču.
- **Korekcije (staff)**: opozovi žreb, poništi rezultat (blokira ako je sledeći meč rešen), ponovo otvori turnir — uz audit.
- **🏁 ZAVRŠI TURNIR** — dostupno tek kad su svi žrebovi objavljeni i mečevi rešeni. **Checkbox potvrda** + ozbiljno, ireverzibilno upozorenje: „Obračunavaju se bodovi svim igračima i ulaze u rang."

### D. KOORDINATORSKI PANEL + ADMIN (🛠️ desktop-first, gust ali čitljiv)

**23. Dashboard sezone** — aktivni turniri, **problemi** (nerešeni mečevi, nedovršeni turniri, duplikati igrača), turniri spremni za završetak, **najnoviji audit događaji**. „Za 30 sekundi vidim šta je problem i šta smem."

**24. Novi turnir** — forma: naziv, serija, sistem, klub, direktor (po imenu), datumi, rok prijave; status lifecycle. Lista turnira.

**25. Uloge korisnika** — tabela: nalog · povezani igrač · uloge (chips: igrac/sudija/koordinator/admin). Admin klikom grant/revoke; zaštita „ne možeš sebi skinuti admin".

**26. Audit log** — ozbiljna gusta tabela: vreme(mono), akcija (revoke_draw…), entitet, izvršilac; filteri; staro/novo.

**27. Korekcije** — poništavanje rezultata, opoziv žreba, ponovo otvori turnir — svaka sa **kontekstom posledica i potvrdom**.

**28. Bodovne tablice** — model klasični / „svi boduju"; matrica serija × kostur × kolo → bodovi; pending changes pre objave.

**29. Članovi** — pretraga, promena kategorije, **spajanje duplikata** (imamo ~17 mogućih duplikata), privatni podaci samo staff.

**30–31. Uplate/članarine · Disciplinske mere** — status uplate, ručni unos, izvoz; opomene/kazne/suspenzije sa trajanjem, sve uz audit.

**32–35. Admin/backend** — system dashboard (status baze/auth/deploy/import/rang obračun), migracije/importi (warnings, duplikati), integracije (Vercel/Supabase/CourtNomad — status ključeva bez tajni), **CMS** (vesti, statične stranice, prevodi SR/EN).

---

## 7. Potpisni „wow" momenti (ono što ovo čini svetskim)

Ubaci ove signature elemente — oni prave razliku između „lepo" i „obara s nogu":
1. **Živi bracket** na stranici turnira — čist, čitljiv, sa nošenjem `[1]`, rezultatima mono, pobednikom u court zelenoj; elegantno se skroluje na telefonu.
2. **Arhiva sa šampionima na kartici** — 🏆 pobednici po kategoriji vidljivi bez klika (naš adut nad ITF-om).
3. **Trofejna vitrina na profilu** — medalje 🥇🥈🥉 + istorija; profil koji igrač hoće da podeli.
4. **„Moj sledeći meč" kartica** — na dan turnira: veliki teren, vreme, protivnik — jedna stvar koja igraču treba.
5. **Rang sa kretanjem** — ▲▼ promena pozicije, mono bodovi, „tabela koja diše".
6. **Unos rezultata za 20 sekundi** — palac, veliki targeti, potvrda posledice.
7. **Status badge sistem** — jedan pogled = razumeš gde je turnir (najava→prijave→žreb→u toku→završen).

---

## 8. Mobile-first i pristupačnost („test na suncu")

- Min touch target **44px**; primarne akcije još veće.
- **Brojevi i rezultati čitljivi na suncu** — mono, krupno, visok kontrast (WCAG AA+).
- Kritične akcije **nikad sitnim tekstom**. Tabele na mobilnom **postaju kartice**.
- Filteri dostupni bez skrivanja iza više menija. Sudijski portal — **jedna ruka, palac**.
- „ZAVRŠI TURNIR", „Opozovi žreb", „Poništi rezultat" — ozbiljan confirmation UX (checkbox/dupla potvrda + posledica).
- Fokus vidljiv (clay outline), semantički HTML, aria na status/ikone, prefers-reduced-motion.
- Stariji korisnici: veći default font, jasan jezik, bez žargona u UI-ju.

---

## 9. Mikrokopi (srpski, kratko, bez marketinškog prenemaganja)

Predloži tekstove za: prazan kalendar · nema rezultata pretrage · „📬 Poslali smo link za prijavu na {email}" · rok prijave istekao · žreb još nije objavljen · rezultat sačuvan (+posledica) · rezultat nije validan · turnir spreman/nije spreman za završetak · destruktivne potvrde · audit zapis · nemate dozvolu · nalog nije povezan sa igračem. Ton: jasan, ljudski, saveznički. Dvojezično SR/EN (SR primaran).

---

## 10. Kvalitet — merilo i šta NE raditi

**Dobro je ako:** igrač odmah vidi sledeću korisnu informaciju; sudija unosi rezultat bez razmišljanja; koordinator jasno vidi rizike i korekcije; javni sajt deluje zvanično i sportski; stariji korisnik radi bez obuke; svaka ključna akcija ima jasnu posledicu; a vizuelno — deluje kao referenca za teniski sajt.

**Anti-obrasci (izbegni):** generički SaaS dashboard; previše gradijenata/glassmorphism; stock profesionalci i stadioni; „teniska akademija za decu" estetika; dekorativne ilustracije bez svrhe; sitne tabele bez mobilne alternative; kartice u karticama; tekst koji objašnjava UI umesto jasnog UI-ja; ball žuta kao velika površina; lep backend bez radne vrednosti.

---

## 11. Šta da isporučiš (format za Claude)

Isporuči redom:
1. Kratak **UX rezime** persona (igrač / sudija / koordinator / admin) — ciljevi, frustracije, prioritet.
2. **Sitemap / IA** (gore, ali tvoja finalna verzija).
3. **Dizajn sistem**: paleta (sa pravilima upotrebe), tipografska skala, komponente sa stanjima (default/hover/active/disabled/error/success): header+mobile nav, footer, dugmad (primary/secondary/ghost/danger/disabled), status badge, tournament card, player card, ranking table + mobile ranking card, match card, **result input**, **bracket view**, group table, schedule row, filter/search bar, segmented control, tabs, empty/loading/error state, confirmation dialog, destructive panel, audit row, role chip, form fields, date/time input, toast.
4. **Klikabilni mockup — desktop I mobilno** za: Početna, Kalendar (+arhiva sa šampionima), Stranica turnira (bracket!), Igrači, **Profil igrača (sa trofejima)**, Rang liste, Pravilnik, Vesti, Kontakt.
5. **Mobile-first mockup**: Prijava (magic link), Moj nalog, Prijava na turnir.
6. **Mobile-first, detaljno**: Sudijski turnir (prijave → žreb → rezultat → ZAVRŠI).
7. **Desktop dense**: Koordinatorski dashboard, Audit log, Korekcije, Uloge, Bodovne tablice; Admin system dashboard + CMS.
8. **Kritični flow-ovi** (dijagram + ekrani): gost→turnir→žreb; igrač magic-link→poveži→prijava; sudija žreb→rezultat→propagacija; sudija završi→bodovi→rang; koordinator korekcija→audit.
9. **Mikrokopi** lista (SR/EN).
10. **A11y preporuke** + **implementacione napomene** za Next.js/Tailwind (mapiraj na postojeće tokene).

Realan sadržaj u svemu (prava srpska imena, klubovi, datumi, rezultati odozgo). Ne staj na lepim screenshot-ovima — dizajniraj proizvod koji bi veterani, direktori i koordinatori koristili celu sezonu, i koji stranac pamti kao najbolji teniski sajt koji je video.
