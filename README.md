# TheLastMoon V30 — Xpay Dedicated Function

V30 memperbaiki HTTP 503 pada `Cek Settlement` dengan memisahkan seluruh API Xpay dari catch-all dashboard utama.

## Perubahan utama

File baru:

```text
functions/api/xpay-cloud.js
```

Endpoint:

```text
/api/xpay-cloud?action=...
```

sekarang ditangani oleh Function khusus tersebut.

Cloudflare Pages menggunakan file-based routing dan route yang lebih spesifik mengalahkan route wildcard. Karena itu:

```text
functions/api/xpay-cloud.js
```

dipakai untuk `/api/xpay-cloud`, bukan:

```text
functions/api/[[path]].js
```

## Apa yang dilewati V30

Request Xpay tidak lagi menjalankan:

- initializeDatabase dashboard utama
- ensureMaster
- migration background settings
- bootstrap seluruh tabel/menu dashboard
- logic lain yang tidak berhubungan dengan Xpay

Request hanya melakukan:

1. validasi D1 binding
2. validasi session
3. validasi permission `xpay-checker`
4. pengecekan ringan tabel Xpay
5. action Xpay yang diminta

## Database

Tetap menggunakan database bersih:

```text
xpay28_transactions
xpay28_upload_history
xpay28_settlement_files
xpay28_settlement_details
xpay28_comparison_results
xpay28_disbursements
xpay28_disbursement_logs
xpay28_disbursement_marks
xpay28_balance_history
```

Data Xpay lama tidak dipakai.

## File yang wajib diupload

```text
functions/api/xpay-cloud.js
functions/api/[[path]].js
xpay-full-cloudflare.js
xpay-full-cloudflare.html
app.js
README.md
```

Paling penting jangan sampai file baru ini tidak ikut GitHub:

```text
functions/api/xpay-cloud.js
```

Kalau file tersebut tidak terupload, `/api/xpay-cloud` akan kembali jatuh ke `[[path]].js`.

## Setelah deploy

Tekan:

```text
Ctrl + Shift + R
```

Cek:

```text
/api/health
```

versi:

```text
v30-xpay-dedicated-function
```

Lalu login dan coba `Xpay Checker → Cek Settlement`.
