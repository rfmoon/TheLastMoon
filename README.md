# TheLastMoon V39 — Excel Plain + Nama File

Perubahan di `Data Pencairan → Hasil Spreadsheet`.

## Excel tanpa Filter

Excel sekarang dibuat sebagai worksheet biasa.

Dihapus:
- AutoFilter pada header
- tombol dropdown/filter di No, Amount, Bank Code, Bank Account, Bank Account Name
- freeze header
- warna/background/border tabel pada header

Header tetap berupa tulisan biasa:

No
Amount
Bank Code
Bank Account
Bank Account Name

Bank Account tetap disimpan sebagai TEXT supaya leading zero aman.

## Nama File

Di sebelah kiri tombol Copy sekarang ada:

Nama : [________________]

Contoh isi:

Pencairan 24 Agustus

Saat tombol Excel ditekan hasilnya:

Pencairan 24 Agustus.xlsx

Kalau Nama kosong, default:

hasil-rekening.xlsx

Karakter yang tidak valid untuk nama file otomatis dibersihkan.

## File yang perlu ditimpa

pencairan-xpay.html
pencairan-xpay.css
pencairan-xpay.js
app.js
functions/api/[[path]].js
README.md

Setelah deploy:
Ctrl + Shift + R

Health version:
v39-pencairan-excel-plain-name
