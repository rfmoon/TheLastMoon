# TheLastMoon V23 — Xpay Checker Cloudflare

Menu baru:

```text
Xpay Checker
```

Menu dapat diberikan kepada User melalui `User Admin`.

## API Cloudflare

Script Xpay Checker tidak lagi memakai `garpusomay.com/xpay-api.php`.

API sekarang berada langsung di Cloudflare Pages TheLastMoon:

```text
GET  /api/xpay-checker/transactions
POST /api/xpay-checker/transactions/bulk
```

Data disimpan ke D1 table:

```text
xpay_transactions
```

## Cara kerja

Mode `Cek Settlement per Tanggal`:

1. pilih CSV XPay;
2. CSV dibaca dan dihitung seperti script sumber;
3. transaksi otomatis disinkronkan ke Cloudflare D1;
4. data memakai ID transaksi XPay untuk dedupe bila ID tersedia.

Mode `Cek dari Cloudflare DB`:

1. tidak perlu upload CSV;
2. pilih Tanggal Cair;
3. script membaca H-2 sampai H-1 dari API Cloudflare;
4. Settlement dan Cutoff dihitung dengan logika yang sama.

## Batas waktu

```text
Settlement = H-1, sebelum 23:30:00
Cutoff     = H-2, mulai 23:30:00 sampai 23:59:59
23:30:00   = CUTOFF
STATUS     = SUCCESS
```

## File baru

```text
xpay-settlement-checker.html
xpay-settlement-checker.css
xpay-settlement-checker.js
```

## File yang perlu ditimpa

```text
app.js
styles.css
schema.sql
README.md
functions/api/[[path]].js
```

Upload juga ketiga file Xpay Checker baru ke root repository.

Setelah deployment:

```text
Ctrl + Shift + R
```

Hak akses User:

```text
User Admin
→ Edit User
→ centang Xpay Checker
→ Simpan
```
