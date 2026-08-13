# TheLastMoon V20 — Checker Full Replace

Bagian **Checker** diganti seluruhnya memakai script terbaru dari user.

## Perubahan logika Checker terbaru

- Google Spreadsheet tetap dibaca dari link yang ditempel di kolom Link Google Spreadsheet.
- Sheet yang dibaca bernama `BANK`.
- Kolom A = Nama Rekening.
- Kolom B = Nomor Rekening.
- Kolom C = Status/Keterangan.
- Pencocokan utama berdasarkan nomor rekening.
- Nama rekening hanya menjadi fallback bila nomor tidak ditemukan.
- Hasil tabel sekarang hanya menampilkan rekening yang ditemukan.
- Rekening yang tidak ditemukan tidak lagi ditampilkan sebagai baris merah.
- Jika tidak ada rekening yang ditemukan, hasil menampilkan:

```text
Kosong ya bos
```

- COPY HASIL juga hanya menyalin rekening yang ditemukan.

## File utama yang berubah

```text
checker-bank.html
checker-bank.css
checker-bank.js
app.js
README.md
functions/api/[[path]].js
```

Setelah deployment:

```text
Ctrl + Shift + R
```
