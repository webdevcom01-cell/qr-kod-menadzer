# QR Kod Menadžer

Servis za QR kodove sa stabilnom redirect adresom: QR slika trajno enkodira
`/r/<code>`, a odredišni (target) URL iza tog koda admin može menjati u bilo
kom trenutku bez ponovnog štampanja koda. Svako otvaranje `/r/<code>` se
atomično broji (`click_count`).

## Env varijable

| Varijabla | Opis |
|---|---|
| `PORT` | Port na kom server sluša (Railway ga sam postavlja). Podrazumevano `3000`. |
| `DB_PATH` | Putanja do SQLite fajla. Podrazumevano `./data/qr.db`. |
| `ADMIN_USER` | Korisničko ime za HTTP Basic Auth na `/admin` rutama. Obavezno. |
| `ADMIN_PASSWORD` | Lozinka za HTTP Basic Auth na `/admin` rutama. Obavezno. |

## Pokretanje lokalno

```bash
npm install
ADMIN_USER=admin ADMIN_PASSWORD=lozinka npm start
```

Server sluša na `http://localhost:3000`. Admin ekran (lista kodova, forma za
kreiranje/izmenu, linkovi ka QR slikama) je na `http://localhost:3000/admin`,
zaštićen HTTP Basic Auth kredencijalima iznad. Redirect ruta `/r/<code>` je
javna, bez autentikacije.

## Deploy (Railway)

Baza je jedan SQLite fajl na disku procesa — da bi podaci preživeli redeploy,
`DB_PATH` na Railway-u mora pokazivati na mount putanju priključenog Railway
Volume-a (npr. `/data/qr.db`), ne na efemerni lokalni disk kontejnera.
