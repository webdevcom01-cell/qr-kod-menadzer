# Tasks: QR Kod Menadžer

Grupisano u 3 agentic-loop-engineer spawn-a (namerno, ne 12 pojedinačnih spawn-ova —
vidi obrazloženje na dnu). Svaki task nosi dokaz (evidence) kad se štiklira.

## Spawn A — Osnova (scaffold, baza, generisanje koda)

- [ ] T1 — Inicijalizuj `package.json` (`engines.node: "22.x"`, `scripts.start`),
  instaliraj `express`, `qrcode`, `express-basic-auth`. (infrastruktura — preduslov za REQ1-8)
- [ ] T2 — Napiši `.gitignore` (`node_modules/`, `data/*.db`, `.agent/`) PRE bilo kakvog
  git init/commit u ovom repou. (preduslov, plan.md Rizik 5)
- [ ] T3 — `db.js`: `node:sqlite` setup, `CREATE TABLE IF NOT EXISTS codes`, helper
  funkcije (`getByCode`, `insertCode`, `updateTargetUrl`, `incrementClickAtomic`
  kao jedan atomičan SQL UPDATE). (satisfies: REQ4, REQ8)
- [ ] T4 — `lib/codegen.js`: generiši 8-karakterni kod iz alfabeta bez 0/O/1/I/l,
  sa retry-om na UNIQUE koliziju (max nekoliko pokušaja). (satisfies: REQ1)

## Spawn B — Rute (poslovna logika)

- [ ] T5 — `POST /admin/codes`: validacija `target_url` (mora biti validan
  `http(s)://`), poziva codegen + db insert. (satisfies: REQ2)
- [ ] T6 — `GET /r/:code`: lookup po kodu; nenađen → 404 bez izmene ičega; nađen →
  atomičan increment pa 302 na `target_url`. (satisfies: REQ4, REQ5)
- [ ] T7 — `POST /admin/codes/:code`: menja `target_url` postojećeg zapisa, kod se
  ne dira, ista validacija kao T5. (satisfies: REQ3)
- [ ] T8 — `express-basic-auth` middleware na svim `/admin*` rutama, kredencijali
  iz `ADMIN_USER`/`ADMIN_PASSWORD` env var-a. (satisfies: REQ7)

## Spawn C — Admin UI i isporuka

- [ ] T9 — `GET /admin`: HTML lista svih zapisa (kod, target_url, click_count,
  link ka QR slici) + forma za kreiranje i forma za izmenu target-a po redu.
  (satisfies: REQ6)
- [ ] T10 — `GET /admin/codes/:code/qr.png`: generiše QR PNG koji enkodira
  `<protokol iz zahteva>://<host iz zahteva>/r/<code>` (host se čita iz
  zahteva, ne iz env var-a — vidi plan.md). (satisfies: Goal 1/2, SPEC obim §3)
- [ ] T11 — `README.md`: env varijable, lokalno pokretanje, napomena o Railway
  Volume-u za `DB_PATH`. (infrastruktura)

## T12 — Verifikacija AC1–AC8 (izvršava se u CONVERGE fazi, ne u Maker spawn-u)

- [ ] T12 — Skriptovana, stvarna HTTP verifikacija svih 8 acceptance kriterijuma
  iz `spec.md` (uključujući AC5 — 20 konkurentnih zahteva ka istom kodu preko
  `Promise.all`). Namerno NIJE deo Maker spawn-ova iznad — ovo je posao
  nezavisnog Converge/Verify prolaza (Step 7 sdd-workflow-a, koji ujedno služi i
  kao idea-to-project TEST faza), da bi verifikacija ostala odvojena od
  implementacije. (satisfies: AC1-AC8)

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
