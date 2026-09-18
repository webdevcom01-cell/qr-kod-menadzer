# CLAUDE.md — qr-kod-menadzer

Constitution za ovaj repo (sdd-workflow, Constitution faza, 18. sept 2026, greenfield).

## Stack

- Runtime: Node.js (LTS)
- Konkretan web framework i biblioteka za bazu/ORM: biraju se i **stvarno smoke-testiraju**
  u Plan fazi (ne pretpostavljati unapred — vidi napomenu ispod o poznatom blokeru)
- Baza: SQLite fajl
- Deploy: Railway; baza mora preživeti redeploy → Railway Volume je non-negotiable
- Git host: GitHub (repo mora tamo pre Railway deploy-a)

## Non-negotiables

- `/r/<code>` (redirect ruta) mora ostati potpuno otvorena, bez ikakve autentikacije.
- Admin rute zahtevaju autentikaciju (deljena lozinka iz env var-a, nikad hardkodovana u kodu).
- Brojač klikova se uvećava atomično na nivou baze (DB-level increment), ne
  read-modify-write u aplikacionom kodu — izgubljen upis pod konkurencijom je poznat
  rizik u ovom projektu (ista lekcija kao `circuit_breaker.py` lock fix, vidi
  `OJACAVANJE-stavka4-circuit-breaker-lock.md` u loops projektu).
- Nema izmišljenih/placeholder podataka — svi podaci nastaju iz admin unosa ili stvarnog
  redirect saobraćaja.
- `git add` / `git commit` / `git push` ka GitHub-u radi isključivo Buky, iz svog pravog
  terminala — Claude ih ne pokreće ni iz cloud šela ni iz device-bridge šela.
- Transfer git repoa (cloud sandbox → Mac) isključivo preko
  `agentic-loop-engineer`-ovog `scripts/portable-repo-transfer.sh` (git bundle), nikad
  tar/cp worktree direktorijuma.
- Environment-capability provera u Plan fazi mora stvarno pokrenuti izabrani CLI
  alat/ORM (ne samo proveriti da je package registry dostupan) — poznat prošli bloker:
  Prisma CLI ne radi u cloud sandbox okruženju jer preuzima native binarni fajl sa
  hosta van standardnog npm registry-ja.

## Compliance

- Nema regulatornih obaveza (nema novca, ličnih podataka u regulatornom smislu, zakonske
  obaveze) → potvrđuje Feature-sized rigor, ne Regulated.
