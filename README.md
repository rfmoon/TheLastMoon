# TheLastMoon V29 — Xpay Checker Fast API Fix

Perbaikan utama:

- HTTP 503 saat Cek Settlement diperbaiki dengan menghapus schema bootstrap berat pada setiap cold start.
- Database Xpay tetap memakai tabel kosong V28 (`xpay28_*`).
- Cek Settlement sekarang memakai query yang lebih ringan dan index settlement_date.
- Jika belum upload apa pun, hasil Cek Settlement adalah 0, bukan error.
- Upload 2+ file transaksi sekaligus tetap aktif.
- Deteksi SETTLEMENT berdasarkan nama header tetap aktif.

File utama yang perlu ditimpa:

```text
functions/api/[[path]].js
xpay-full-cloudflare.js
xpay-full-cloudflare.html
app.js
README.md
```

Setelah deploy:

```text
Ctrl + Shift + R
```

Cek `/api/health` dan pastikan version:

```text
v29-xpay-fast-api
```
