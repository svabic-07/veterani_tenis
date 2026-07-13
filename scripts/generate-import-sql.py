# -*- coding: utf-8 -*-
"""
TVS · Generator idempotentnog import SQL-a iz izvoza stare baze.

Ulaz:  migration-data_2/migration-data/TVS_clanovi.xlsx  (sheet "Igraci")
       migration-data_2/migration-data/tvs_kategorije.jsonl
Izlaz: scripts/out/*.sql  (gitignored — sadrži lične podatke!)

Pokretanje:  python scripts/generate-import-sql.py
Generisani SQL se primenjuje na Supabase redom (01, 02, 03...).
Sve je upsert po legacy_id — bezbedno za ponovno pokretanje.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "migration-data_2" / "migration-data"
OUT = ROOT / "scripts" / "out"
BATCH = 400

# IOC (stari sajt) → ISO-2 (players.drzava)
IOC_TO_ISO2 = {
    "SRB": "RS", "MNE": "ME", "ROU": "RO", "ITA": "IT", "BIH": "BA",
    "GRE": "GR", "MKD": "MK", "SLO": "SI", "HUN": "HU", "CRO": "HR",
    "GER": "DE", "POL": "PL", "RUS": "RU", "USA": "US", "AUT": "AT",
    "SUI": "CH", "FRA": "FR", "ESP": "ES", "BUL": "BG", "CZE": "CZ",
    "SVK": "SK", "GBR": "GB", "NED": "NL", "BEL": "BE", "SWE": "SE",
    "NOR": "NO", "DEN": "DK", "FIN": "FI", "UKR": "UA", "CAN": "CA",
    "AUS": "AU", "TUR": "TR", "CYP": "CY", "ALB": "AL", "KOS": "XK",
    "POR": "PT", "IRL": "IE", "ISR": "IL", "JPN": "JP", "CHN": "CN",
    "BRA": "BR", "ARG": "AR", "KAZ": "KZ", "BLR": "BY", "LTU": "LT",
    "LAT": "LV", "EST": "EE", "MDA": "MD", "ARM": "AM", "GEO": "GE",
    "AZE": "AZ", "LUX": "LU", "MLT": "MT", "ISL": "IS", "EGY": "EG",
    "RSA": "ZA", "IND": "IN", "KOR": "KR", "NZL": "NZ", "MEX": "MX",
    "CHI": "CL", "COL": "CO", "VEN": "VE", "URU": "UY", "PER": "PE",
    # nestandardne vrednosti viđene u izvozu
    "UK": "GB", "CRC": "CR", "TUN": "TN", "S": "RS",
}

FOLD = str.maketrans({"ć": "c", "č": "c", "š": "s", "ž": "z", "đ": "dj",
                      "Ć": "c", "Č": "c", "Š": "s", "Ž": "z", "Đ": "dj"})

# ćirilica → latinica (izvoz mestimično sadrži ćirilične nazive klubova)
CYR = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "dj", "е": "e",
    "ж": "z", "з": "z", "и": "i", "ј": "j", "к": "k", "л": "l", "љ": "lj",
    "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r", "с": "s",
    "т": "t", "ћ": "c", "у": "u", "ф": "f", "х": "h", "ц": "c", "ч": "c",
    "џ": "dz", "ш": "s",
})

# ključevi koji nisu pravi klubovi (placeholder unosi sa starog sajta)
JUNK_CLUB_KEYS = {"", "x", "tk", "bez kluba", "nema"}

# placeholder "igrači" sa starog sajta — ne uvoze se
JUNK_PLAYER_RE = re.compile(r"^(bye|test)$|^\d+\.\s*igra", re.IGNORECASE)


def clean(v):
    if v is None:
        return ""
    v = str(v).strip()
    return "" if v in ("-", "-/-", "null", "None", "/") else v


def fold_key(name: str) -> str:
    """Normalizovan ključ za spajanje varijanti naziva kluba:
    mala slova, translit (dijakritici + ćirilica), interpunkcija → razmak."""
    s = name.lower().translate(FOLD).translate(CYR)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slugify(name: str) -> str:
    return fold_key(name).replace(" ", "-") or "x"


def parse_email(raw: str):
    """Prva validna adresa iz polja (staro polje ume da sadrži više adresa,
    razmake unutar adrese i sl.). Vraća (email|"", upozorenje|None)."""
    email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    raw = raw.strip().lower()
    if not raw:
        return "", None
    for cand in re.split(r"[,;]+", raw):
        cand = cand.strip()
        if email_re.match(cand):
            return cand, None
        squeezed = cand.replace(" ", "")
        if "@" in squeezed and email_re.match(squeezed):
            return squeezed, f"email {cand!r} → {squeezed!r}"
    return "", f"nevalidan email {raw!r} → preskočen"


def q(v) -> str:
    """SQL literal (NULL ili escapovan string)."""
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def main():
    OUT.mkdir(exist_ok=True)
    warnings = []

    # ---------- učitavanje ----------
    wb = openpyxl.load_workbook(DATA / "TVS_clanovi.xlsx", read_only=True)
    ws = wb["Igraci"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    # 0 id · 1 ime_prezime · 2 telefon · 3 email · 4 godiste · 5 klub · 6 grad
    # 7 nacionalnost · 8 igra · 9 podloga · 10-12 ranking · 13 profil_url

    # poslednja poznata TVS kategorija po igraču
    latest_kat = {}
    with open(DATA / "tvs_kategorije.jsonl", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            year = int(r["godina"])
            for k in ("I", "II", "III", "IV", "V"):
                if clean(r.get(k)):
                    pid = r["player_id"]
                    if pid not in latest_kat or year > latest_kat[pid][0]:
                        latest_kat[pid] = (year, k)

    # ---------- klubovi: normalizacija varijanti ----------
    club_variants = defaultdict(Counter)  # fold_key -> Counter(originalna varijanta)
    for r in rows:
        name = clean(r[5])
        if name:
            key = fold_key(name)
            if key in JUNK_CLUB_KEYS or key.isdigit():
                continue
            club_variants[key][name] += 1

    def canonical(counter: Counter) -> str:
        # najčešća varijanta; kod izjednačenja prednost imaju dijakritici
        best = max(counter.items(),
                   key=lambda kv: (kv[1], sum(ch in "ćčšžđĆČŠŽĐ" for ch in kv[0])))
        return best[0]

    clubs = {}  # fold_key -> (slug, canonical_name)
    slugs_seen = {}
    for key, variants in sorted(club_variants.items()):
        slug = slugify(key)
        if slug in slugs_seen:
            warnings.append(f"KOLIZIJA SLUGA: {slug!r} za {key!r} i {slugs_seen[slug]!r}")
            slug = slug + "-2"
        slugs_seen[slug] = key
        clubs[key] = (slug, canonical(variants))

    club_sql = [
        "-- TVS import · 01 · klubovi (idempotentno)\n"
        "insert into public.clubs (legacy_id, naziv) values"
    ]
    club_sql.append(",\n".join(
        f"  ({q(slug)}, {q(name)})" for slug, name in sorted(clubs.values())
    ))
    club_sql.append("on conflict (legacy_id) do nothing;")
    (OUT / "01_clubs.sql").write_text("\n".join(club_sql), encoding="utf-8")

    # ---------- igrači ----------
    player_values = []
    private_values = []
    unmapped_nat = Counter()
    skipped_players = []

    for r in rows:
        legacy_id = str(r[0])
        full = re.sub(r"\s+", " ", clean(r[1]))
        if JUNK_PLAYER_RE.match(full):
            skipped_players.append(f"{legacy_id}: {full!r}")
            continue
        parts = full.split(" ")
        ime, prezime = (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (parts[0], "")
        if not prezime:
            warnings.append(f"igrač {legacy_id}: jednodelno ime {full!r} — prezime prazno")

        god = clean(r[4])
        godiste = god if re.fullmatch(r"(19|20)\d\d", god) else None
        if god and not godiste:
            warnings.append(f"igrač {legacy_id} ({full}): nevalidno godište {god!r} → NULL")

        nat = clean(r[7]).upper()
        if not nat:
            drzava = "RS"
        elif nat in IOC_TO_ISO2:
            drzava = IOC_TO_ISO2[nat]
        else:
            unmapped_nat[nat] += 1
            drzava = "RS"

        klub = clean(r[5])
        klub_key = fold_key(klub) if klub else ""
        klub_slug = clubs[klub_key][0] if klub_key in clubs else None

        kat = latest_kat.get(r[0], (None, None))[1]

        player_values.append(
            f"  ({q(legacy_id)}, {q(ime)}, {q(prezime)}, "
            f"{godiste or 'NULL'}, {q(klub_slug)}, {q(kat)}, {q(drzava)})"
        )

        email, email_warn = parse_email(clean(r[3]))
        if email_warn:
            warnings.append(f"igrač {legacy_id} ({full}): {email_warn}")
        telefon = clean(r[2])
        if email or telefon:
            private_values.append(f"  ({q(legacy_id)}, {q(email)}, {q(telefon)})")

    def write_batches(prefix: str, header: str, values: list, footer: str):
        n = 0
        for i in range(0, len(values), BATCH):
            n += 1
            chunk = ",\n".join(values[i:i + BATCH])
            (OUT / f"{prefix}_{n:02d}.sql").write_text(
                header + "\n" + chunk + "\n" + footer, encoding="utf-8")
        return n

    players_header = (
        "-- TVS import · 02 · igrači (idempotentno)\n"
        "insert into public.players (legacy_id, ime, prezime, godiste, klub_id, kategorija, drzava)\n"
        "select v.legacy_id, v.ime, v.prezime, v.godiste::int, c.id,\n"
        "       v.kategorija::public.quality_category, v.drzava\n"
        "from (values"
    )
    players_footer = (
        ") as v(legacy_id, ime, prezime, godiste, klub_slug, kategorija, drzava)\n"
        "left join public.clubs c on c.legacy_id = v.klub_slug\n"
        "on conflict (legacy_id) do update set\n"
        "  ime = excluded.ime, prezime = excluded.prezime, godiste = excluded.godiste,\n"
        "  klub_id = excluded.klub_id, kategorija = excluded.kategorija, drzava = excluded.drzava;"
    )
    np_batches = write_batches("02_players", players_header, player_values, players_footer)

    private_header = (
        "-- TVS import · 03 · kontakti (player_private, idempotentno)\n"
        "insert into public.player_private (player_id, email, telefon)\n"
        "select p.id, nullif(v.email, '')::citext, nullif(v.telefon, '')\n"
        "from (values"
    )
    private_footer = (
        ") as v(legacy_id, email, telefon)\n"
        "join public.players p on p.legacy_id = v.legacy_id\n"
        "on conflict (player_id) do update set\n"
        "  email = excluded.email, telefon = excluded.telefon;"
    )
    nc_batches = write_batches("03_private", private_header, private_values, private_footer)

    # duplikati ime+godište (isti čovek pod dva ID-ja?) — za ručnu proveru
    name_god = Counter((clean(r[1]).lower(), clean(r[4])) for r in rows)
    for (name, god), c in sorted(name_god.items()):
        if c > 1:
            warnings.append(f"mogući duplikat: {name!r} ({god}) × {c}")

    (OUT / "warnings.txt").write_text("\n".join(warnings), encoding="utf-8")

    if skipped_players:
        print(f"preskočeni placeholder zapisi: {skipped_players}")
    print(f"igrača: {len(player_values)} ({np_batches} serija)")
    print(f"kontakata: {len(private_values)} ({nc_batches} serija)")
    print(f"klubova: {len(clubs)} (od {sum(len(v) for v in club_variants.values())} varijanti u podacima... "
          f"distinct stringova: {sum(1 for _ in club_variants)})")
    print(f"kategorija dodeljeno: {sum(1 for r in rows if r[0] in latest_kat)}")
    if unmapped_nat:
        print(f"NEMAPIRANE nacionalnosti (→ RS): {dict(unmapped_nat)}")
    print(f"upozorenja: {len(warnings)} → scripts/out/warnings.txt")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
