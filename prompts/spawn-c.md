# Task spec — Spawn C (admin UI, QR slika, README)

Ti si Maker agent u izolovanom git worktree-u za "QR Kod Menadžer". `db.js`,
`lib/codegen.js` (Spawn A) i `server.js` sa `/r/:code`, `POST /admin/codes`,
`POST /admin/codes/:code`, basic-auth middleware (Spawn B) su već u repou —
DOPUNI `server.js`, ne piši ga ponovo od nule.

**Pročitaj:** `specs/qr-kod-menadzer/spec.md`, `plan.md` (posebno tabelu ruta —
`GET /admin` i `GET /admin/codes/:code/qr.png`), `tasks.md` sekcija "Spawn C".

**Tvoj obim — ISKLJUČIVO ovo:**

- [ ] T9 — `GET /admin` (unutar postojećeg `/admin` auth-zaštićenog prostora):
  vrati HTML (server-rendered, template literal je sasvim dovoljno, bez
  frontend build koraka) sa: listom svih zapisa (`code`, `target_url`,
  `click_count`, link/`<img>` ka `/admin/codes/:code/qr.png`), formom
  (HTML `<form>`, obično POST, ne treba JS/fetch) za kreiranje novog koda
  (šalje na `POST /admin/codes`), i po-redu formom za izmenu `target_url`
  (šalje na `POST /admin/codes/:code`). Posle uspešnog POST-a iz forme,
  redirect (302) nazad na `/admin` da se GET forma ne resubmit-uje na
  refresh. (satisfies: REQ6)
- [ ] T10 — `GET /admin/codes/:code/qr.png` (unutar `/admin`, znači već
  auth-zaštićeno): ako kod ne postoji → 404; ako postoji, generiši QR PNG
  preko `qrcode` paketa koji enkodira
  `` `${req.protocol}://${req.get('host')}/r/${code}` `` (host iz zahteva,
  NE iz env var-a — vidi plan.md, izbegava chicken-and-egg sa još-nepoznatim
  Railway domenom), postavi `Content-Type: image/png`, pošalji PNG buffer.
  (satisfies: SPEC obim §3 — QR slika)
- [ ] T11 — `README.md`: kratko — šta projekat radi, env varijable
  (`PORT`, `DB_PATH`, `ADMIN_USER`, `ADMIN_PASSWORD`), kako pokrenuti lokalno
  (`npm install && npm start`), napomena da `DB_PATH` na Railway-u mora
  pokazivati na mount putanju Volume-a da bi podaci preživeli redeploy.

**Definicija gotovo za OVU iteraciju:**
- `npm start` i dalje radi bez pucanja.
- Ručni smoke-test (privremeni skript/curl, ukloni posle): otvori `/admin` sa
  ispravnim basic-auth kredencijalima → vidi HTML listu (prazna je OK ako nema
  zapisa); kreiraj kod kroz formu/POST; otvori `/admin/codes/<kod>/qr.png` →
  dobijaš PNG čiji prvih 8 bajtova je PNG magic broj; dekoduj taj PNG (ako ti
  je zgodno, npr. kroz neku brzu proveru ili samo proveru veličine/magic broja
  je dovoljno za ovu iteraciju — puna dekodna provera enkodiranog URL-a ide u
  CONVERGE fazu).

**Ograničenja:** isto kao Spawn A/B — lokalni worktree commit je OK; ne diraj
fajlove van scope-a; ako naiđeš na nešto neplanirano, upiši u
`.agent/task_log.md` i zaustavi se umesto da tiho rešiš van dogovora.
