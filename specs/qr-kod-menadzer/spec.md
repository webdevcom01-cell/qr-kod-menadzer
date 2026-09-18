# Spec: QR Kod Menadžer

**Status:** Draft → Approved
**Rigor level:** Feature-sized (rigor-scaling.md) — nov modul, više endpoint-a i podsistema,
nema novca/ličnih podataka/zakonske obaveze.

## 1. Problem / Motivation

Statičan QR kod trajno enkodira jedan URL u samu sliku — ako odredište promeni,
kod treba ponovo generisati i preštampati. Nema ni načina da se zna da li je
kod stvarno skeniran. Treba servis gde QR kod vodi na stabilnu redirect adresu,
a odredišni URL iza nje admin menja bez dodira na sam kod, uz brojanje otvaranja.

## 2. Goals

1. Admin kreira QR kod koji trajno enkodira jedan redirect URL (kod se posle
   kreiranja nikad ne menja).
2. Admin može promeniti odredišni (target) URL koda u bilo kom trenutku; QR
   slika ostaje ista.
3. Svako otvaranje redirect linka se pouzdano broji, uključujući pod
   konkurentnim saobraćajem (nema izgubljenih upisa).
4. Admin operacije su zaštićene autentikacijom; redirect ruta je potpuno javna.

## 3. Non-goals

- Analitika po pojedinačnom skeniranju (vreme, geo, uređaj, referrer) — samo
  agregatni brojač.
- Nalozi za više korisnika/uloge — jedna deljena admin lozinka.
- Korisnički birani (custom) slug-ovi — v1 generiše kod automatski.
- Custom domen — koristi se URL koji dodeli hosting platforma.
- Brisanje ili deaktivacija koda.
- Rate-limiting / anti-abuse zaštita na redirect ruti.
- Perzistentna sesija/login UI za admin (v1 koristi jednostavnu HTTP autentikaciju,
  ne puni login flow sa kolačićima — potvrđeno u Plan fazi).

## 4. Requirements

1. Sistem generiše jedinstven kratak alfanumerički kod (nedvosmislen alfabet,
   bez lako zamenljivih karaktera kao 0/O, 1/I/l) prilikom kreiranja novog
   zapisa; kolizija sa postojećim kodom se detektuje i automatski se pokušava
   ponovo sa novim kodom pre nego što se kreiranje prijavi kao neuspešno.
2. Admin može kreirati novi zapis unosom validnog `http(s)://` target URL-a;
   nevalidan URL format se odbija pre upisa u bazu, sa jasnom porukom.
3. Admin može izmeniti target URL postojećeg zapisa; kod (slug) se pri tome
   nikad ne menja niti se ponovo generiše.
4. `GET /r/<code>` pronalazi zapis po kodu i izdaje HTTP 302 redirect na
   njegov trenutni target URL, uz atomično uvećanje brojača klikova za taj
   zapis (DB-level increment u istoj operaciji, ne read-then-write u
   aplikacionom kodu).
5. `GET /r/<code>` za kod koji ne postoji vraća čist 404 odgovor, bez
   uvećanja bilo kog brojača.
6. Admin ekran prikazuje listu svih zapisa sa trenutnim `click_count` za svaki,
   osvežen na svaki učitavanje stranice (ne mora biti real-time/websocket).
7. Sve admin rute (kreiranje, lista, izmena) zahtevaju važeću autentikaciju;
   zahtev bez nje se odbija (401/403), ne izvršava se nikakva izmena podataka.
8. Podaci (zapisi kodova i brojači) prežive restart/redeploy procesa — baza
   nije samo u memoriji.
9. Sistem izlaže javnu, potpuno neautentikovanu, read-only `GET /health` rutu
   koja vraća osnovni status i broj postojećih zapisa (`codes_count`), bez
   otkrivanja bilo kog target URL-a ili pojedinačnog `click_count`-a — svrha
   je da automatizovana provera (ljudska ili agentska) može da potvrdi da je
   servis živ i da baza radi, bez potrebe za admin kredencijalima. Dodato
   18. sept 2026, posle prvog pilota, gde je nedostatak ovakve rute značio
   da svaka naredna nezavisna verifikacija zahteva Bukyjevo ručno unošenje
   admin lozinke (vidi `claude/PILOT-runda10-...md`, sekcija nalaza).

## 5. Acceptance Criteria

- AC1: Kreiranje 20 zapisa zaredom ne proizvodi nijednu koliziju koda niti
  grešku (proverljivo pokretanjem 20 stvarnih kreiranja).
- AC2: Unos `nije-url` kao target vraća grešku validacije, zapis se ne kreira.
- AC3: Izmena target URL-a postojećeg zapisa, pa odmah zatim otvaranje
  redirect linka za taj kod, vodi na NOVI URL; slug ostaje identičan pre/posle.
- AC4: N stvarnih, uzastopnih otvaranja redirect linka za isti kod rezultira
  `click_count` uvećanim za tačno N (provereno čitanjem admin liste posle).
- AC5: N *konkurentnih* (paralelnih, ne uzastopnih) otvaranja istog redirect
  linka i dalje rezultira `click_count` uvećanim za tačno N — nema izgubljenih
  upisa (test sa npr. 20 paralelnih zahteva).
- AC6: Otvaranje `/r/<nepostojeci-kod>` vraća 404, i click_count nijednog
  postojećeg zapisa se ne menja.
- AC7: Pristup admin ruti bez validne autentikacije se odbija; sa ispravnom
  autentikacijom prolazi.
- AC8: Posle restarta/redeploy-a procesa, ranije kreirani zapisi i njihovi
  click_count-ovi su i dalje prisutni i tačni.
- AC9: `GET /health` bez ikakve autentikacije (bez Authorization header-a)
  vraća HTTP 200 sa JSON telom koje sadrži bar `status` i `codes_count`
  (broj = COUNT(*) iz `codes` tabele u tom trenutku); odgovor NE sadrži
  nijedan `target_url` niti nijedan pojedinačni `click_count`.

## 6. Out of scope for this change

- Migracija/import postojećih QR kodova iz drugog sistema — nema ih, greenfield.
- Bilo kakav UI framework/dizajn sistem izvan minimalnog funkcionalnog admin
  ekrana (nema brand/dizajn zahteva za v1).

---

## UC-1 / UC-2 / UC-3 — generisanje koda i redirect/brojač logika

### UC-1: Standard slučaj — kreiranje i redirect
**Input:** Admin kreira zapis sa `target_url = "https://example.com/meni"`.
Sistem generiše kod, npr. `k7m2Qx9p`. Neko otvori `/r/k7m2Qx9p`.
**Expected output:** HTTP 302 → `https://example.com/meni`; `click_count` za
taj zapis raste sa 0 na 1.

### UC-2: Error slučaj — nepostojeći kod
**Input:** `GET /r/zzzzzzzz` (kod koji nikad nije generisan).
**Expected output:** HTTP 404, nijedan `click_count` u bazi se ne menja.

### UC-3: Edge slučaj — konkurentni redirect-i na isti kod
**Input:** 20 paralelnih HTTP zahteva ka `/r/k7m2Qx9p` poslato približno
istovremeno.
**Expected output:** Svih 20 zahteva dobija 302 na tačan target URL;
`click_count` posle svega je tačno prethodna vrednost + 20 — ni jedan upis
nije izgubljen zbog race-a (ovo je razlog zašto Requirement 4 traži DB-level
atomični increment, ne read-modify-write u aplikaciji).

## Otvorena pitanja razrešena u Clarify (bez potrebe da čekaju odgovor —
razumna tehnička odluka, ne pravi fork; navedeno radi transparentnosti)

- Mehanizam admin autentikacije (HTTP Basic Auth vs. login forma + sesija):
  biram HTTP Basic Auth za v1 — jedna deljena lozinka, nema potrebe za
  session/cookie infrastrukturom za jednog korisnika. Formalizuje se u Plan.
- Dužina/alfabet generisanog koda: 8 karaktera, base62-slično ali bez
  vizuelno-zamenljivih znakova (bez 0/O/1/I/l) — dovoljno prostora da
  kolizija bude retka na v1 obimu (par desetina/stotina kodova).
