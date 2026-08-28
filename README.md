# TheLastMoon V50 — Dashboard Clean + GIF Background

## Dashboard

Dihapus dari Dashboard:
- AKTIF / jumlah menu
- ONLINE / status sistem
- MASTER / tingkat akses
- AMAN / masa sesi login
- seluruh bagian Akses cepat

Dashboard sekarang hanya menampilkan sambutan ringkas.

## Settings Background

Settings sekarang mendukung dua cara:

1. Tempel link HTTPS gambar/GIF.
2. Upload file langsung dari komputer.

Format upload:
- GIF
- JPG/JPEG
- PNG
- WebP

Ukuran upload maksimal:
1.7 MB

File upload disimpan di Cloudflare D1 dan dapat dipakai oleh semua akun.

Endpoint:
POST /api/settings/background-upload
GET  /api/background-media

Cara:
1. Settings
2. Pilih file GIF/gambar
3. Tekan Upload File
4. URL upload otomatis masuk ke daftar background
5. Tekan Simpan untuk semua akun

Upload baru mengganti file upload sebelumnya.
Link HTTPS lain tetap bisa digunakan bersamaan sebagai slideshow.

Setelah deploy:
Ctrl + Shift + R

Health:
v50-dashboard-clean-gif-background
