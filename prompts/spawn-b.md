# Task spec — Spawn B (rute: poslovna logika)

Ti si Maker agent u izolovanom git worktree-u za "QR Kod Menadžer". `db.js` i
`lib/codegen.js` iz Spawn A su već u repou (merge-ovani u main pre nego što je
ovaj worktree napravljen) — koristi ih, ne piši ih ponovo.

**Pročitaj:** `specs/qr-kod-menadzer/spec.md`, `plan.md` (posebno tabelu ruta i
env varijable), `tasks.md` sekcija "Spawn B".

**Tvoj obim — ISKLJUČIVO ovo, ništa iz Spawn C (nema admin HTML liste, nema QR
PNG rute, nema README):**

- [ ] T5 — `POST /admin/codes`: validacija `target_url` (mora parse-ovati kao
  validan `http://` ili `https://` URL — koristi `new URL(str)` pa proveri
  `protocol`), poziva `lib/codegen.js` da kreira zapis. Nevalidan URL → 400 sa
  jasnom porukom, ništa se ne upisuje. (satisfies: REQ2)
- [ ] T6 — `GET /r/:code`: `db.getByCode`; nenađen → 404 (plain text ili JSON,
  bez izmene ičega); nađen → `db.incrementClickAtomic(code)` PA TEK ONDA 302
  redirect na `target_url`. (satisfies: REQ4, REQ5)
- [ ] T7 — `POST /admin/codes/:code`: menja `target_url` postojećeg zapisa
  (`db.updateTargetUrl`), ista URL validacija kao T5. Ako kod ne postoji → 404.
  Kod (slug) se nikad ne dira. (satisfies: REQ3)
- [ ] T8 — `express-basic-auth` middleware primenjen na SVE `/admin*` rute
  (uključujući T5/T7 iznad — dodaj middleware pre njih), kredencijali iz
  `process.env.ADMIN_USER` / `process.env.ADMIN_PASSWORD` (baci jasnu grešku na
  startu ako nisu setovani, ne padaj tiho na undefined). `/r/:code` OSTAJE bez
  ikakve autentikacije — ne stavljaj middleware iznad nje. (satisfies: REQ7)

Napravi `server.js` kao entry point koji povezuje sve gore (Express app,
middleware, rute), `require('./db')` i `require('./lib/codegen')`. Admin GET
lista (HTML) je Spawn C posao — za T5/T7 dovoljan je JSON ili plain-text
odgovor, ne mora HTML još.

**Definicija gotovo za OVU iteraciju:**
- `npm start` diže server bez pucanja (uz `ADMIN_USER`/`ADMIN_PASSWORD` env var
  setovane u smoke-testu).
- Ručni HTTP smoke-test (curl ili node fetch, privremeni skript, ukloni posle):
  kreiraj kod (T5), otvori `/r/<kod>` → 302 na tačan URL i click_count raste
  (T6), izmeni target (T7) i proveri da redirect vodi na novi URL, pristup
  admin ruti BEZ auth → 401/403 (T8), `/r/<kod>` i dalje radi bez ikakve auth
  glave.

**Ograničenja:** isto kao Spawn A — bez commit-a dok ne završiš i smoke-testiraš
(lokalni worktree commit je OK, publish nije tvoj posao); ako naiđeš na nešto
van dogovorenog, zaustavi se i upiši u `.agent/task_log.md`.
