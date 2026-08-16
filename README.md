# TheLastMoon V24 — Xpay Checker 23:30:00 Settlement Logic

Bagian Xpay Checker menggunakan HTML V24 terbaru.

## Logika V24

Tanggal Cair = H.

```text
SETTLEMENT normal:
PAYMENT H-1 00:00:00–23:29:59

CUTOFF normal:
PAYMENT H-2 23:30:01–23:59:59
```

Khusus PAYMENT tepat:

```text
23:30:00
```

sistem membaca kolom:

```text
SETTLEMENT
```

Aturan:

```text
SETTLEMENT berisi tanggal yang sama dengan Tanggal Cair
→ masuk SETTLEMENT

SETTLEMENT kosong + PAYMENT berada pada H-2
→ masuk CUTOFF
```

Hanya `STATUS = SUCCESS`.

## Cloudflare D1

Kolom baru pada `xpay_transactions`:

```text
settlement_raw
```

V24 otomatis melakukan migration untuk database V23 yang sudah ada.

Data lama V23 belum memiliki nilai SETTLEMENT. Untuk transaksi tepat 23:30:00, upload ulang CSV sumber satu kali agar kolom SETTLEMENT ikut masuk ke D1.

## Asset baru

```text
xpay-settlement-checker-v24.css
xpay-settlement-checker-v24.js
```

HTML:

```text
xpay-settlement-checker.html
```

sudah menunjuk ke asset V24.

## File yang perlu ditimpa/upload

```text
xpay-settlement-checker.html
xpay-settlement-checker-v24.css
xpay-settlement-checker-v24.js
app.js
schema.sql
README.md
functions/api/[[path]].js
```

Setelah deploy:

```text
Ctrl + Shift + R
```
