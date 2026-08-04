# TheLastMoon V12 — Shared Pencairan XPAY Database

Perbaikan utama:

- Database rekening tidak lagi memakai localStorage sebagai database utama.
- Database disimpan di Cloudflare D1.
- Rekening yang ditambah oleh satu user akan tersedia untuk semua user.
- Sinkronisasi otomatis setiap 15 detik.
- Sinkronisasi ulang saat tab dibuka kembali atau browser kembali fokus.
- Tersedia tombol **Sinkronkan Sekarang**.
- Database localStorage versi lama otomatis dipindahkan ke D1 satu kali.

## File yang harus ditimpa

```text
pencairan-xpay.html
pencairan-xpay.css
pencairan-xpay.js
schema.sql
README.md
functions/api/[[path]].js
```

File lain boleh ikut di-upload agar seluruh project tetap sama dengan V11.

## Setelah deployment

1. Tunggu deployment Cloudflare berhasil.
2. Tekan `Ctrl + Shift + R`.
3. Buka `Pencairan → Pencairan XPAY`.
4. Database lama pada browser master akan otomatis dikirim ke D1.
5. Buka akun lain dan klik **Sinkronkan Sekarang**, atau tunggu maksimal 15 detik.

## Endpoint baru

```text
GET    /api/pencairan-xpay/accounts
POST   /api/pencairan-xpay/accounts/bulk
DELETE /api/pencairan-xpay/accounts/:id
DELETE /api/pencairan-xpay/accounts
```
