# TheLastMoon V36 — Pencairan XPAY 3 Baris + Master DB

Tampilan Pencairan XPAY dibuat lebih pendek dan disusun vertikal menjadi 3 baris.

## Susunan

Baris 1:
1. Tambah Database Banyak Sekaligus

Baris 2:
2. Tempel Data Transaksi
- hasil spreadsheet langsung berada di sisi kanan
- tidak menjadi card terpisah lagi

Baris 3:
3. Konversi Data Rekening
- input kiri
- hasil kanan

Pada layar kecil otomatis berubah menjadi 1 kolom.

## Daftar Database

Daftar Database sekarang:

- hanya tampil untuk Master Administrator
- default dalam keadaan HIDE
- Master punya tombol `Lihat Daftar Database`
- setelah dibuka dapat ditekan `Hide`
- tombol `Salin Semua Database` hanya tampil ke Master
- tombol `Hapus Semua` hanya tampil ke Master
- hapus satu rekening dan hapus seluruh database juga dilindungi `requireMaster()` di backend

User biasa tetap dapat memakai proses transaksi dan sinkron database untuk pencocokan, tetapi panel Daftar Database tidak tampil di UI.

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

v36-pencairan-3baris-master-db
