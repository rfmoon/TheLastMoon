# TheLastMoon V21 — Checker Strict Match

Bagian **Checker** diganti seluruhnya menggunakan script terbaru user.

## Perubahan logika utama

Data tempelan sekarang mempertahankan:

```text
BANK
NAMA REKENING
NOMOR REKENING
```

Sedangkan status tetap dibaca dari sheet `BANK`.

Rekening dianggap **KETEMU** hanya jika:

```text
Nama Rekening sama
DAN
Nomor Rekening sama
```

BANK dari data tempelan tidak digunakan sebagai kunci pencocokan karena spreadsheet BANK hanya berisi:

```text
A = Nama Rekening
B = Nomor Rekening
C = Status
```

## Hasil

Kolom hasil sekarang:

```text
BANK
NAMA REKENING
NOMOR REKENING
STATUS
```

BANK, Nama, dan Nomor mengikuti data yang ditempel.
STATUS diambil dari Google Spreadsheet.

Jika tidak ada data yang cocok:

```text
Kosong ya bos
```

COPY HASIL juga memakai empat kolom tersebut.

## File yang perlu ditimpa

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
