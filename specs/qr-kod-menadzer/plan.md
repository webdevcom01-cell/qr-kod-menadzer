# Plan: QR Kod Menadžer

**Status:** Approved for Tasks

## Environment-capability check (izvršeno uživo, ne pretpostavljeno)

Cloud sandbox okruženje, Node v22.22.2 / npm 10.9.7.

| Alat | Provera | Rezultat |
|---|---|---|
| `node:sqlite` (built-in, DatabaseSync) | Kreirana tabela, upisan red, 20x atomični `UPDATE ... SET click_count = click_count + 1`, pročitana vrednost | PROŠAO — click_count = 20, tačno. Bez eksternog download-a (built-in modul). |
| `qrcode` (npm) | `npm install`, pa `QRCode.toBuffer()` stvarno pozvan | PROŠAO — 1281B PNG, ispravan PNG magic broj |
| `express` + `express-basic-auth` (npm) | `npm install`, pa server stvarno pokrenut i pravi HTTP zahtev poslat na njega | PROŠAO — `/ping` odgovorio sa `pong` |

Nijedan izabran alat ne preuzima binarne fajlove van standardnog npm registry-ja —
izbegnut je poznat Prisma-tip bloker (binaries.prisma.sh je van npm registry-ja i
blokiran je organizacionom mrežnom politikom cloud sandbox okruženja; ovde ta
kategorija rizika ne postoji jer `node:sqlite` je built-in a `qrcode`/`express`/
`express-basic-auth` su čist JS bez native/binary koraka).

**Migration/schema baseline:** nema prethodnog — greenfield, schema se kreira
`CREATE TABLE IF NOT EXISTS` na startu procesa (nema posebnog migration alata,
namerno, za ovaj obim — v1 ima jednu tabelu koja se ne menja).

**Test runner:** nema instaliranog test frameworka u ovom trenutku — flagovano
kao rizik ispod (nije Regulated rigor, pa nije blokirajuće, ali se beleži).

## Arhitektura

Jedan Node.js proces (Express), server-rendered HTML (bez frontend build koraka —
namerno, za minimalan v1 obim), SQLite fajl kao jedina baza.

```
server.js         — entry point, wiring ruta
db.js             — node:sqlite setup, schema init, query helperi
lib/codegen.js    — generisanje jedinstvenog 8-char koda (retry na koliziju)
lib/render.js      — sitne HTML template funkcije za admin ekran
.gitignore        — node_modules/, data/*.db, **.agent/**  (vidi Rizik 5 ispod)
```

## Data model

```sql
CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Interfejsi (rute)

| Ruta | Metoda | Zaštita | Šta radi |
|---|---|---|---|
| `/r/:code` | GET | Nema (javno) | Lookup po kodu; nađen → atomičan `UPDATE click_count = click_count + 1` pa 302 na `target_url`; nenađen → 404, bez izmene ičega |
| `/admin` | GET | HTTP Basic Auth | Lista svih kodova + click_count + forma za kreiranje |
| `/admin/codes` | POST | HTTP Basic Auth | Kreira novi zapis (validacija target URL-a, generiše kod sa retry na koliziju) |
| `/admin/codes/:code` | POST | HTTP Basic Auth | Menja `target_url` postojećeg zapisa (kod se ne dira) |
| `/admin/codes/:code/qr.png` | GET | HTTP Basic Auth | Generiše/vraća QR PNG koji enkodira `<trenutni-host>/r/<code>` (host se čita iz zahteva, ne iz hardkodovanog env var-a — izbegava chicken-and-egg problem sa još-nepoznatim Railway domenom pre prvog deploy-a) |
| `/health` | GET | Nema (javno) | Vraća `{"status":"ok","codes_count":N}` — `N` = `SELECT COUNT(*) FROM codes`. Registrovana PRE `app.use('/admin', adminAuth)`, po istom obrascu kao `/r/:code`, da ostane nedvosmisleno van auth-a. Dodato 18. sept 2026 (REQ9/AC9) radi buduće nezavisne verifikacije bez admin kredencijala. |

## Env varijable

- `PORT` — port servera (Railway ga sam postavlja)
- `DB_PATH` — putanja do SQLite fajla; podrazumevano `./data/qr.db` lokalno, na
  Railway-u mora pokazivati na mount putanju Volume-a (npr. `/data/qr.db`) — vidi Rizik 2
- `ADMIN_USER`, `ADMIN_PASSWORD` — kredencijali za HTTP Basic Auth na admin rutama

## Rizici

1. **`node:sqlite` je eksperimentalan u Node 22** (potvrđeno upozorenjem uživo pri
   smoke-testu, ne samo iz dokumentacije). Prihvatljivo za Feature-sized rigor i v1
   obim ovog testa; ublažavanje: `engines` polje u `package.json` pinuje Node major
   verziju, tako da Railway koristi istu verziju gde je ponašanje potvrđeno.
2. **Railway persistentno skladište mora biti stvarno podešeno (Volume) pre nego
   što se AC8 (podaci prežive redeploy) može smatrati ispunjenim.** Ovo se NE
   pretpostavlja — proverava se uživo u DEPLOY fazi: kreirati Volume, montirati na
   putanju koju `DB_PATH` koristi, uraditi pravi redeploy, pa pročitati podatke
   nazad. Ako Volume ne postoji, SQLite fajl na Railway-u je efemeran i AC8 pada.
3. **Jedan SQLite fajl = jedna instanca.** v1 namerno pretpostavlja tačno jednu
   Railway instancu (nema horizontalnog skaliranja) — SQLite file-locking nije
   bezbedan za više paralelnih procesa nad istim fajlom. Nije u obimu da se to
   reši za v1.
4. **Nema instaliranog test frameworka u ovom repou.** Flagovano po Plan-fazi
   pravilu — pošto je rigor Feature-sized (ne Regulated), ovo NIJE blokirajuće,
   ali znači da AC1–AC8 iz spec.md moraju biti verifikovani ručnim/skriptovanim
   pozivima u TEST i CONVERGE fazi, ne automatizovanim test suite-om.
5. **`.agent/` orkestraciona memorija agentic-loop-engineer-a ne sme procuriti u
   prvi git commit ovog repoa** — poznata, već jednom pogođena greška u ovom istom
   loops projektu (vidi START-HERE.md proces-lekciju od 17. sept). `.gitignore`
   mora sadržati `.agent/` PRE prvog commit-a, provereno pre nego što agentic-loop-
   engineer uopšte pokrene prvi worktree/spawn.
6. **Transfer ovog repoa iz cloud sandboxa na Buky-jev Mac** (radi stvarnog GitHub
   push-a njegovim kredencijalima) ide isključivo preko `portable-repo-transfer.sh`
   (git bundle export/import), nikad tar/cp — izričito pravilo iz CLAUDE.md i
   poznata ranija greška u ovom projektu.

## Affected files (nov, greenfield repo)

`package.json`, `server.js`, `db.js`, `lib/codegen.js`, `lib/render.js`,
`.gitignore`, `README.md` (kratak, za GitHub), plus već postojeći `CLAUDE.md` i
`specs/qr-kod-menadzer/*.md`.
