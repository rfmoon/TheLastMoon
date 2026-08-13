# TheLastMoon V22 — Checker Master Secret

Perubahan keamanan pada menu **Checker**:

## Master Administrator

Master melihat bagian:

```text
MASTER ADMINISTRATOR ONLY
Link Google Spreadsheet
[SIMPAN LINK]
[LIHAT LINK]
```

Link disimpan di Cloudflare D1 melalui server.

Master dapat:

- melihat link;
- mengganti link;
- menyimpan link;
- menekan BACA SHEET BANK;
- melakukan pengecekan rekening.

## User biasa

User yang diberi akses `Checker`:

- TIDAK menerima link spreadsheet;
- TIDAK dapat membuka endpoint konfigurasi;
- TIDAK dapat melihat URL melalui HTML/JavaScript;
- hanya melihat tombol:

```text
BACA SHEET BANK
```

Setelah ditekan, browser meminta data BANK ke server TheLastMoon.
Cloudflare Function yang membaca Google Spreadsheet, bukan browser user.

## Penting: set link sekali setelah upgrade

V22 sengaja tidak menaruh URL spreadsheet di source code agar link tidak bocor ke User.

Setelah deploy:

1. Login sebagai Master Administrator.
2. Buka `Checker`.
3. Tempel Link Google Spreadsheet.
4. Klik `SIMPAN LINK`.
5. Klik `BACA SHEET BANK`.

Sesudah itu User cukup membuka Checker dan menekan `BACA SHEET BANK`.

## Akses Google Sheets

Karena sekarang Cloudflare Function yang membaca Spreadsheet, spreadsheet harus dapat dibaca tanpa login interaktif Google, misalnya akses read-only yang sesuai.

Jika Google Sheet hanya dapat dibuka karena browser Master sedang login ke Google, server Cloudflare tidak akan memiliki sesi Google tersebut. Untuk sheet private sepenuhnya diperlukan integrasi Google Sheets API/service account.

## Endpoint internal baru

Master only:

```text
GET /api/checker-bank/config
PUT /api/checker-bank/config
```

User dengan akses Checker:

```text
GET /api/checker-bank/data
```

Endpoint data tidak mengembalikan URL spreadsheet.

## File yang perlu ditimpa

```text
checker-bank.html
checker-bank.css
checker-bank.js
app.js
_headers
README.md
functions/api/[[path]].js
```

Setelah deployment:

```text
Ctrl + Shift + R
```
