# TheLastMoon V37 — Pencairan XPAY 3 Kolom

V37 memperbaiki layout V36.

Yang dimaksud sekarang:

KOLOM A
1. Tambah Database Banyak Sekaligus

KOLOM B
2. Tempel Data Transaksi

KOLOM C
3. Konversi Data Rekening

Ketiga kolom berada berdampingan dari kiri ke kanan.

Tetapi isi di DALAM masing-masing kolom disusun atas ke bawah:

judul
textarea
tombol
status
hasil

Jadi tidak ada lagi input dan hasil yang dipaksa menyamping di dalam satu card.

Daftar Database tetap:
- Master Administrator only
- default Hide
- Master bisa Show / Hide
- delete satu / hapus semua tetap dilindungi backend Master

Responsive:
- desktop lebar: 3 kolom A/B/C
- layar kecil: otomatis 1 kolom ke bawah

File yang perlu ditimpa:

pencairan-xpay.html
pencairan-xpay.css
app.js
functions/api/[[path]].js
README.md

pencairan-xpay.js tetap kompatibel dan sudah disertakan di ZIP lengkap.

Setelah deploy:
Ctrl + Shift + R

Health version:
v37-pencairan-3kolom
