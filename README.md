# TheLastMoon V35 — Pencairan XPAY + Konversi Rekening Cepat

V35 menambahkan tool baru langsung di dalam halaman Pencairan XPAY.

## Posisi

Tool berada di bagian atas Pencairan XPAY, tepat di bawah judul/subtitle
dan sebelum Database & Konversi Rekening yang sudah ada.

Tampilannya dibuat compact:
- desktop: input kiri, hasil kanan
- layar lebih kecil: otomatis turun menjadi 1 kolom
- hasil tabel dibatasi tinggi supaya tidak membuat halaman terlalu panjang

## Input

Nominal | Kode Bank | Nomor Rekening | Nama Rekening

Contoh:

25,000,000    6    051665123654    Fabian Aditya

## Output

Nama Rekening | Nomor Rekening | Nominal

Nominal otomatis diformat dengan koma.

Nomor rekening dipertahankan sebagai string agar leading zero tidak hilang.

## Tombol

- Proses Data
- Tempel Clipboard
- Bersihkan
- Copy Hasil
- Copy Spreadsheet

Copy Spreadsheet memberi apostrof pada rekening agar leading zero aman
saat ditempel ke spreadsheet.

## CSP

Tidak menggunakan inline onclick.
Semua tombol memakai addEventListener di pencairan-xpay.js.

## File yang perlu ditimpa/upload

pencairan-xpay.html
pencairan-xpay.css
pencairan-xpay.js
app.js
functions/api/[[path]].js
README.md

Setelah deploy:

Ctrl + Shift + R

Health version:

v35-pencairan-quick-converter
