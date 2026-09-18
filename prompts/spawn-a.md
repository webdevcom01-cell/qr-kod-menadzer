# Task spec — Spawn A (osnova: scaffold, baza, generisanje koda)

Ti si Maker agent u izolovanom git worktree-u za projekat "QR Kod Menadžer".

**Obavezno pročitaj pre bilo kog koda:**
- `specs/qr-kod-menadzer/spec.md` (šta i zašto, acceptance criteria AC1-AC8)
- `specs/qr-kod-menadzer/plan.md` (arhitektura, data model, env varijable, rizici)
- `specs/qr-kod-menadzer/tasks.md` (samo sekcija "Spawn A" ispod)

**Tvoj obim u ovoj iteraciji — ISKLJUČIVO ovi taskovi, ništa iz Spawn B/C:**

- [ ] T1 — Inicijalizuj `package.json` (`engines.node: "22.x"`, `scripts.start`),
  instaliraj `express`, `qrcode`, `express-basic-auth`. (satisfies: infrastruktura za REQ1-8)
- [ ] T2 — Napiši `.gitignore` (`node_modules/`, `data/*.db`, `.agent/`, `.claude/`)
  AKO već ne postoji ili nije potpun — proveri pre pisanja, ne prepisuj postojeći
  bez razloga. (preduslov, plan.md Rizik 5)
- [ ] T3 — `db.js`: `node:sqlite` setup (`DatabaseSync`), `CREATE TABLE IF NOT EXISTS
  codes (code TEXT PRIMARY KEY, target_url TEXT NOT NULL, click_count INTEGER NOT
  NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`, helper
  funkcije: `getByCode(code)`, `insertCode(code, targetUrl)`, `updateTargetUrl(code,
  newUrl)`, `incrementClickAtomic(code)` — poslednja MORA biti jedan atomičan SQL
  `UPDATE codes SET click_count = click_count + 1 WHERE code = ?`, ne read-then-write
  u JS-u (vidi CLAUDE.md non-negotiable i spec.md UC-3). DB putanja iz `DB_PATH` env
  var-a, podrazumevano `./data/qr.db` (napravi `data/` folder ako ne postoji).
  (satisfies: REQ4, REQ8)
- [ ] T4 — `lib/codegen.js`: generiši 8-karakterni kod iz alfabeta BEZ `0 O 1 I l`
  (definiši eksplicitan alfabet konstantom), funkcija koja vraća nov kod i UMEĆE
  ga u bazu uz retry na UNIQUE constraint grešku (max 5 pokušaja, pa baci grešku).
  (satisfies: REQ1)

**Definicija gotovo za OVU iteraciju** (ne za ceo projekat):
- `npm install` prolazi bez greške.
- Ručni smoke-test (napiši kratak `node -e` ili privremeni skript, izvrši ga, pa ga
  po potrebi ukloni ako nije deo trajnog koda): kreirati 20 kodova zaredom kroz
  `codegen.js` bez kolizije/greške (AC1), i da `incrementClickAtomic` posle 20 poziva
  na isti kod tačno vrati `click_count = 20`.
- NEMA HTTP ruta u ovoj iteraciji — to je Spawn B. Ne piši `server.js` sa rutama
  još; ako ti treba minimalan entry point za smoke-test, drži ga odvojeno ili
  jasno označi kao privremeno.

**Ograničenja:**
- Ne diraj fajlove van scope-a ove iteracije.
- Ne pravi git commit dok ne završiš i ne pokreneš svoj smoke-test — onda jedan
  smislen commit sa porukom koja imenuje koji task-ovi su završeni.
- Ako naiđeš na nešto što spec/plan nisu predvideli, zaustavi se i upiši to u
  `.agent/task_log.md`, ne izmišljaj tiho rešenje van dogovorenog obima.
