# TheLastMoon V26 — Xpay Checker Tanpa API

Xpay Checker V26 tidak memakai API untuk data transaksi XPay.

## Penyimpanan

CSV yang di-upload disimpan langsung ke browser menggunakan IndexedDB:

```text
Database: TheLastMoonXpayChecker
Store: transactions
```

Artinya:

- tidak ada request ke `/api/xpay-checker/...`;
- tidak ada proses baca/tulis Cloudflare D1 untuk Xpay Checker;
- mode database lebih cepat karena membaca data lokal;
- data hanya tersedia pada browser/perangkat yang sama.

## Cara kerja

Mode CSV:

```text
Pilih CSV
→ parse transaksi
→ simpan ke IndexedDB
→ hitung Settlement/Cutoff
```

Mode `Cek Settlement 23:30`:

```text
Pilih tanggal
→ baca IndexedDB browser
→ hitung Settlement/Cutoff
```

## Logika V25 tetap dipakai

Tanggal Cair = H.

```text
Settlement normal:
H-1 00:00:00–23:29:59

Cutoff normal:
H-2 23:30:01–23:59:59
```

Khusus `23:30:00`:

```text
SETTLEMENT = tanggal H-1
→ SETTLEMENT

SETTLEMENT kosong + PAYMENT H-2
→ CUTOFF
```

Hanya `STATUS = SUCCESS`.

## Catatan penting

Karena tanpa API, data IndexedDB tidak otomatis ikut ke komputer/browser User lain.

Kalau browser data/cache/site data dihapus, database lokal juga dapat terhapus.

## File utama

```text
xpay-settlement-checker.html
xpay-settlement-checker-v26.css
xpay-settlement-checker-v26.js
app.js
README.md
functions/api/[[path]].js
```

Setelah deploy:

```text
Ctrl + Shift + R
```
