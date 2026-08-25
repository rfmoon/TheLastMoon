# TheLastMoon V41 — WD Bersih Shared Realtime

DATABASE NAMA WD BERSIH sekarang disimpan di Cloudflare D1,
bukan hanya IndexedDB browser.

Tabel:
wd_bersih_names

Semua user yang memiliki akses Pencairan XPAY membaca database yang sama.

Sinkron otomatis:
setiap 3 detik.

Migrasi:
Saat V41 pertama dibuka, browser akan mencoba membaca database lama
`WD_BERSIH_DATABASE` dari IndexedDB dan otomatis menggabungkannya ke D1.
Data lokal lama tidak dihapus.

API dedicated:
GET  /api/wd-bersih?action=list
POST /api/wd-bersih?action=bulk

File baru WAJIB:
functions/api/wd-bersih.js

File utama:
functions/api/wd-bersih.js
pencairan-xpay.html
pencairan-xpay.js
app.js
schema.sql
functions/api/[[path]].js
README.md

Setelah deploy:
Ctrl + Shift + R

Health:
v41-wd-bersih-shared-realtime
