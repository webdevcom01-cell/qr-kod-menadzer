# Tasks: QR Kod Menadžer

Grupisano u 3 agentic-loop-engineer spawn-a (namerno, ne 12 pojedinačnih spawn-ova —
vidi obrazloženje na dnu). Svaki task nosi dokaz (evidence) kad se štiklira.

## Spawn A — Osnova (scaffold, baza, generisanje koda)

- [x] T1 — `package.json` (`engines.node: "22.x"`, `scripts.start`), deps instalirani.
  Evidence: `npm install` prošao u worktree-u i posle merge-a; `package.json` u main.
- [x] T2 — `.gitignore` potpun pre prvog commit-a. Evidence: prvi commit `c3737f0`
  već sadrži `.gitignore` sa `.agent/`; naknadno dopunjen (`.claude/`, `.agent-orchestrator/`).
- [x] T3 — `db.js` gotov. Evidence: Checker (Spawn A) potvrdio `incrementClickAtomic`
  je jedan atomičan SQL UPDATE; realan smoke-test 20x increment = click_count 20.
- [x] T4 — `lib/codegen.js` gotov. Evidence: Checker (Spawn A) potvrdio alfabet
  ispravno izostavlja 0/O/1/I/l; modulo-bias nalaz ispravljen (`crypto.randomInt`),
  20 kodova kreirano bez kolizije u smoke-testu.

## Spawn B — Rute (poslovna logika)

- [x] T5 — `POST /admin/codes` gotov. Evidence: Checker (Spawn B) potvrdio URL
  validaciju (`javascript:`/`file://`/prazno odbačeno); tip-provera propust
  nađen i ispravljen; realan smoke-test (Converge) potvrdio kreiranje radi.
- [x] T6 — `GET /r/:code` gotov. Evidence: Checker potvrdio redosled
  increment-pa-redirect i da 404 grana ne upisuje ništa; realan smoke-test
  potvrdio 302 na tačan URL i click_count raste.
- [x] T7 — `POST /admin/codes/:code` gotov. Evidence: Checker potvrdio 404 pre
  izmene, kod se ne dira; realan smoke-test potvrdio target promenu.
- [x] T8 — auth middleware gotov. Evidence: Checker potvrdio redosled
  registracije (middleware pre admin ruta, `/r/:code` van njega); realan
  smoke-test: admin bez auth → 401 (implicitno kroz browser-style proveru),
  `/r/:code` radi bez auth header-a.

## Spawn C — Admin UI i isporuka

- [x] T9 — `GET /admin` gotov. Evidence: Checker (Spawn C) potvrdio XSS
  escaping ispravan (code i target_url escape-ovani svuda uklj. atribute);
  realan smoke-test: forma kreira kod, forma za izmenu sad prikazuje trenutnu
  vrednost (Checker nalaz, ispravljeno).
- [x] T10 — QR ruta gotova. Evidence: realan smoke-test — `file /tmp/test-qr.png`
  → "PNG image data, 148 x 148" (stvarno dekodovan PNG, ne samo magic broj);
  try/catch dodat (Checker nalaz).
- [x] T11 — `README.md` gotov. Evidence: fajl postoji u main posle merge-a,
  sadrži env var listu i Railway Volume napomenu.

## T12 — Verifikacija AC1–AC8 (izvršava se u CONVERGE fazi, ne u Maker spawn-u)

- [x] T12 — Skriptovana, stvarna HTTP verifikacija svih 8 acceptance kriterijuma
  iz `spec.md` (uključujući AC5 — 20 konkurentnih zahteva ka istom kodu preko
  `Promise.all`). Namerno NIJE deo Maker spawn-ova iznad — ovo je posao
  nezavisnog Converge/Verify prolaza (Step 7 sdd-workflow-a, koji ujedno služi i
  kao idea-to-project TEST faza), da bi verifikacija ostala odvojena od
  implementacije. (satisfies: AC1-AC8)
  Evidence: `specs/qr-kod-menadzer/verify.md` — svih 8 AC PASS sa stvarnim
  izvršenim dokazom (AC1-AC7 skriptovano, AC8 ručno kroz stvaran restart
  procesa). Usput nađen i ispravljen bug u samom `verify-ac.js` (brisao je
  `data/` dir ispod već-žive server konekcije, uzrokujući lažni
  "readonly database" fail na AC1) — detalji u verify.md.

---

## Obrazloženje granularnosti (3 spawn-a, ne 12)

Runda 6 pilota je pokazala vrednost MANJIH, ranije-proverljivih spawn-ova — pre
svega zato što jeftinije hvata toolchain blokere (kao Prisma CDN slučaj), ne
samo zbog logičkog rizika. Za ovaj namerno mali obim (nema poznatih rizičnih
alata posle Plan-faznog smoke-testa — sve je već uživo potvrđeno da radi),
trošak fine granularnosti (12 odvojenih worktree/Maker/Checker ciklusa) nema
istu isplativost kao u pilotu koji je stao na infrastrukturnom blokeru. Spawn A
je namerno izdvojen prvi i najmanji (scaffold+baza+codegen, bez HTTP ruta) da i
dalje uhvati jeftino bilo koji preostali, nepredviđen toolchain problem pre
nego što se pređe na ostatak — isti princip kao runda 6, primenjen na 3, ne 12,
jedinica.
