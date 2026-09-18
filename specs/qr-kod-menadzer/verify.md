# Verify: QR Kod Menadžer (CONVERGE faza / T12)

Skriptovana + ručna HTTP verifikacija AC1–AC8 protiv **stvarne, žive** instance
`server.js` (`node:sqlite`, port 3998, izolovan `DB_PATH=./data/ac-verify.db`).
Nijedan nalaz ovde nije pretpostavka — svaki je dobijen izvršavanjem stvarnog
HTTP zahteva ili stvarnog restart-a procesa.

## Nalaz i ispravka pre nego što je verifikacija uopšte mogla da prođe

Prvi pokušaj (`node scripts/verify-ac.js` protiv upravo pokrenutog servera)
je vratio **20/20 FAIL na AC1** sa `Error: attempt to write a readonly
database` u `db.js:insertCode`. Root cause: `verify-ac.js`-ova sopstvena
`main()` je na početku radila
`fs.rmSync(path.dirname(DB_PATH), { recursive: true, force: true })` —
brisala je `data/` direktorijum DOK je server već imao SQLite fajl otvoren
u njemu (server je startovan, pa tek onda skript pozvan, prema uputstvu u
zaglavlju fajla koje kaže "Requires the server to already be running").
Brisanje direktorijuma ispod žive konekcije uklanja mesto gde SQLite mora
da upiše rollback-journal fajl za transakciju, što SQLite prijavljuje kao
`SQLITE_READONLY` ("attempt to write a readonly database") — nije bug u
`db.js`/`server.js`, nego u samom test skriptu, čija sopstvena
pretpostavka (server već radi) je bila u sukobu sa sopstvenim setup korakom
(obriši direktorijum). Ispravka: uklonjen `fs.rmSync` poziv iz
`verify-ac.js`; čišćenje `data/` ostaje odgovornost pozivaoca, PRE starta
servera (već je tako urađeno u shell komandi koja je koristi). Posle
ispravke: čist re-run, sve prolazi.

## AC1–AC7 — `node scripts/verify-ac.js` (stvaran output)

```
PASS AC1 create #0 -> 201
...(20/20)...
PASS AC1 all 20 codes unique
PASS AC2 invalid url -> 400
PASS AC3 edit -> 200
PASS AC3 redirect after edit goes to new url
PASS AC4 sequential click_count == 1 + N
PASS AC5 concurrent click_count == 20 exactly (no lost updates)
PASS AC6 unknown code -> 404
PASS AC6 no click_count changed on 404
PASS AC7 admin without auth -> 401
PASS AC7 admin with auth -> 200
PASS AC7 /r/:code needs NO auth

SVE PROVERE PROŠLE (AC1-AC7 od 8; AC8 posebno)
```

- **AC1** (REQ1, REQ2): 20/20 kreiranja vratilo 201, svih 20 kodova
  jedinstveno. `crypto.randomInt` fix (modulo-bias) drži se pod stvarnim
  opterećenjem.
- **AC2** (REQ2): `target_url: "nije-url"` → 400, ništa upisano.
- **AC3** (REQ3): izmena target URL-a → 200; redirect odmah posle vodi na
  NOVI url (`https://example.com/AC3-NOVI`), slug nepromenjen.
- **AC4** (REQ4): 5 uzastopnih otvaranja → click_count tačno 1+5=6
  (1 od AC3-proverenog redirect-a + 5 novih).
- **AC5** (REQ4, kritičan test): 20 *konkurentnih* (`Promise.all`) zahteva
  na sveži kod → click_count tačno 20. Atomični DB-level `UPDATE ... SET
  click_count = click_count + 1` (bez read-modify-write u app kodu) drži se
  pod stvarnom konkurencijom — nema izgubljenih upisa.
- **AC6** (REQ5): nepostojeći kod → 404; pun HTML admin liste
  pre/posle byte-identičan (string comparison) — dokazano da se ništa nije
  promenilo, ne samo da jedan red izgleda isto.
- **AC7** (REQ7): `/admin` bez auth → 401; sa auth → 200; `/r/:code` radi
  BEZ ikakve auth glave (302).

## AC8 — restart persistencije (REQ8), ručno, van skripta (zahteva stvaran restart procesa)

Skript namerno ne testira ovo (ne može iz istog živog procesa). Urađeno
ručno, sa stvarnim `kill` i novim `node server.js` procesom nad ISTIM
`DB_PATH` fajlom (bez brisanja fajla između):

1. Pre restart-a: `GET /admin` (sa auth) → parsiran HTML, 20 redova sa
   `code=click_count`, sačuvano u `/tmp/before_restart.txt`
   (npr. `FkXqXGjd=7`, `kSCKbPgK=20`, ostalih 18 sa `=0`).
2. `kill <pid>` stvarnog `node server.js` procesa (ne `rm -rf data` —
   samo proces ugašen, fajl ostaje na disku).
3. Novi `node server.js` proces pokrenut sa istim env (`DB_PATH=./data/ac-verify.db`).
4. Posle restart-a: `GET /admin` ponovo, parsiran isti način,
   `/tmp/after_restart.txt`.
5. `diff /tmp/before_restart.txt /tmp/after_restart.txt` → **prazan diff**,
   svih 20 zapisa i njihovi click_count-ovi identični pre/posle.
6. Dodatna živa provera posle restart-a (ne samo statičko čitanje): stvaran
   `GET /r/FkXqXGjd` → 302, i click_count za taj kod pravilno prešao sa 7 na
   8 — dokazuje da baza nije samo čitljiva posle restarta nego i dalje
   normalno upisiva (increment i dalje radi).

**Rezultat: AC8 PASS**, dokazano stvarnim restart-om procesa, ne
pretpostavkom da SQLite fajl "naravno preživljava".

## Napomena o `node:sqlite` (Risk 1 iz plan.md)

Eksperimentalni status (`ExperimentalWarning: SQLite is an experimental
feature`) je vidljiv u startup log-u na svakom pokretanju, kao što je
plan.md predvideo — nije uticao ni na jedan test ovde, ali ostaje otvoren
rizik za produkciju (Node verzija promena može promeniti API).

## Zaključak

AC1–AC8 (svih 8 iz spec.md §5), **PASS**, sa stvarnim izvršenim dokazom za
svaki — uključujući i konkurentnost (AC5) i persistenciju kroz stvaran
restart (AC8), dva najrizičnija zahteva u ovom projektu. Jedini nalaz u
ovom prolazu je bio bug u samom test skriptu (opisan gore), ne u
proizvodnom kodu; ispravljen i ponovo verifikovan.

**T12 (tasks.md) → gotovo.** idea-to-project TEST faza takođe zadovoljena
istim dokazom (isti kriterijumi, ista izvršena provera).
