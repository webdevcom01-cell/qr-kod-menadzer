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
- **Finalni publish** (`git push` ka GitHub remote-u, i prvi bazni commit repoa koji ide
  na Buky-jev Mac) radi isključivo Buky, iz svog pravog terminala — Claude ga ne pokreće
  ni iz cloud šela ni iz device-bridge šela.
- **LOKALNI commit-ovi unutar agentic-loop-engineer worktree-a** (Maker-ov osnovni
  mehanizam — diff koji Checker verifikuje dolazi odatle) su OK i OČEKIVANI — to nije
  isto što i "git push"/publish, ostaju lokalni, nikad ne diraju `main` ni GitHub.
  Potvrđeno eksplicitno sa Bukyjem 18. sept 2026 pre prvog spawn-a. Maker NE sme da
  odbije da commit-uje svoj sopstveni worktree rad pozivajući se na ovo pravilo.
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
