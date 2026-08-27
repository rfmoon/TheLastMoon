# TheLastMoon V43 — Kelola Database WD Bersih

DATABASE NAMA WD BERSIH sekarang bisa:
- Tambah / Simpan nama baru
- Cari database
- Hapus satu-satu
- Hapus semua database
- Ganti semua database dengan daftar baru

Semua perubahan tetap disimpan di Cloudflare D1 shared `wd_bersih_names` dan tersinkron ke user lain sekitar 3 detik.

API tambahan:
POST /api/wd-bersih?action=delete
POST /api/wd-bersih?action=clear
POST /api/wd-bersih?action=replace

Setelah deploy tekan Ctrl + Shift + R.

Health: v43-wd-database-manage
