# SPEC: QR Kod Menadžer

**Status:** Draft → Approved for build
**Faza:** Ideja → Spec → Build → Test → Deploy

## 1. Problem / Ideja

Statičan QR kod trajno enkodira jedan URL u samu sliku. Ako se odredišni link
promeni (premeštena stranica događaja, novi link u meniju, izmenjena marketinška
kampanja), sam QR kod postaje mrtav ili se mora ponovo štampati. Dodatno, ne
postoji način da se sazna da li je, i koliko puta, neki QR kod stvarno skeniran.

Potreban je servis za **dinamičke** QR kodove: QR kod vodi na stabilan redirect
URL koji sistem kontroliše, a odredišni (target) URL iza njega admin može
promeniti u bilo kom trenutku bez ponovnog generisanja/štampanja koda. Svaki
redirect se broji.

## 2. Cilj

Omogućiti kreiranje QR koda koji preusmerava kroz stabilan kratak URL na
odredišni URL koji admin može menjati, i pratiti koliko puta je svaki kod
otvoren/skeniran.

## 3. Obim (Scope)

**Ulazi u obim (v1):**
- Admin ekran (zaštićen lozinkom) za:
  - kreiranje novog QR koda (generiše se jedinstven kratak kod + QR slika za
    zadati početni target URL)
  - pregled liste svih kodova sa brojem klikova za svaki
  - izmenu target URL-a postojećeg koda
- Javna redirect ruta (npr. `GET /r/<code>`): pronalazi kod, uvećava brojač
  klikova, izdaje HTTP redirect (302) na trenutni target URL. Bez ikakve
  zaštite — mora ostati potpuno otvorena, to je suština servisa.
- Jedna baza: tabela kodova `{code, target_url, created_at, click_count}` (ili
  ekvivalentno) — klikovi se broje kroz inkrementirajuću kolonu, ne kroz
  poseban log po skeniranju.
- Generisanje QR slike (PNG) koja enkodira redirect URL, prikazana/dostupna za
  preuzimanje na admin ekranu odmah po kreiranju koda.

**Van obima (v1):**
- Analitika po pojedinačnom skeniranju (vreme, lokacija, uređaj) — samo prost
  rastući brojač.
- Nalozi za više korisnika — jedna deljena admin lozinka.
- Korisnički biran (custom) kratak kod — v1 generiše nasumičan slug automatski.
- Custom domen — koristi se URL koji dodeli Railway.
- Brisanje/deaktivacija koda kroz UI.
- Rate-limiting / anti-abuse zaštita na redirect ruti.

## 4. Izvor podataka / sadržaja

Nema spoljašnjeg izvora podataka. Svi podaci (kodovi, target URL-ovi, brojevi
klikova) nastaju iz admin unosa i iz stvarnog redirect saobraćaja — sistem sam
generiše svoje podatke, ništa se ne izmišlja niti se koristi placeholder sadržaj.

## 5. Izgled / Format

Mali full-stack web servis (Node.js), sa SQLite bazom koja mora preživeti
redeploy (Railway Volume — vidi tačku 7). Konkretan framework/ORM/biblioteka
za bazu biraju se i **stvarno smoke-testiraju** u `sdd-workflow` Plan fazi
(ne pretpostavlja se unapred zbog poznatog ranijeg blokera sa Prisma binary
CDN-om — vidi `PILOT-runda6-pun-lanac-od-idea-faze.md`). Ovo je **stvaran,
živ deployment**, ne artifact i ne statičan fajl.

## 6. Publika i distribucija

Buky (admin) upravlja kodovima kroz admin ekran. Bilo ko ko skenira/otvori QR
kod pogađa javnu redirect rutu. Ovo je stvaran deployment namenjen da traje
(ne jednokratni test) — cilj sesije je da se dokaže cela DEPLOY faza lanca.
Isporučuje se:
- GitHub repo (izvor istine, Constraints Rule #7)
- Živ Railway URL (javno dostupan)

## 7. Definicija "gotovo" (test faza)

- Admin kreira novi kod kroz UI → dobija validan QR PNG i kratak redirect URL.
- Otvaranje tog redirect URL-a (stvarno, ne pretpostavka) vodi na tačan trenutni
  target URL (radi HTTP 302).
- Posle N stvarnih otvaranja redirect linka, admin ekran pokazuje `click_count`
  uvećan za tačno N.
- Admin promeni target URL postojećeg koda → redirect odmah vodi na NOVI URL;
  sam kod (slug/slika) ostaje nepromenjen.
- Posle redeploy-a servisa na Railway-u, postojeći kodovi i njihovi
  `click_count` ostaju netaknuti (proverava se stvarnim redeploy-om i
  ponovnim čitanjem podataka, ne pretpostavkom).
- Admin ruta zahteva lozinku (env var); redirect ruta je javno dostupna bez
  ikakve zaštite.
- Repo je na GitHub-u; Railway deploy je povučen sa tog repoa (ne ad-hoc upload).

## 8. Sledeći koraci

- Analitika po skeniranju (vreme, referrer, grubo geo/device)
- Custom (korisnički birani) slug-ovi
- Deaktivacija/brisanje koda
- Više admin naloga / prava pristupa
- Custom domen
