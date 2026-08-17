# TheLastMoon V27 — Xpay Checker Full Cloudflare Port

Bagian **Xpay Checker** diganti seluruhnya berdasarkan kumpulan script PHP Xpay yang diberikan user.

PHP/MySQL tidak dijalankan di Cloudflare Pages. Karena itu fungsi utama dipindahkan menjadi:

```text
Frontend:
xpay-full-cloudflare.html
xpay-full-cloudflare.css
xpay-full-cloudflare.js

Backend:
functions/api/[[path]].js

Database:
Cloudflare D1 binding DB
```

Semua request Xpay memakai API same-origin milik TheLastMoon:

```text
/api/xpay-cloud?action=...
```

Tidak ada request ke `xpay-api.php`, `xpay-upload.php`, `xpay-dashboard.php`, atau server PHP lama.

## Fitur yang dipindahkan

### Deposit
- Upload Transaction CSV/XLSX/XLS
- Upload Settlement CSV/XLSX/XLS
- Kelola Batch
- Cek Settlement per Tanggal
- Comparison
- Semua Data Transaksi
- Balance History
- Upload Balance
- Kelola Batch Balance

### Withdraw
- Upload Disbursement
- List + filter status
- Audit Log berdasarkan REF_ID
- Mark Done / Unmark
- Status DONE preserved saat REF_ID di-upload ulang
- Kelola Batch Disbursement

## Logika Transaction sumber

Mengikuti `calculateSettlementInfo()` dari script PHP yang diberikan:

```text
PAYMENT >= 23:30:00
→ CUTOFF
→ settlement_date = payment date + 2 hari

PAYMENT < 23:30:00
→ SETTLEMENT
→ settlement_date = payment date + 1 hari
```

Jadi V27 sengaja mengikuti sistem PHP terbaru yang di-upload user, bukan logika V25/V26 sebelumnya.

## Comparison

Expected:

```text
SUM(record_value) GROUP BY partner_id
```

Actual:

```text
SUM(settlement amount) GROUP BY partner_id
```

Status:
- MATCH
- MISMATCH
- MISSING_IN_BANK
- MISSING_IN_SYSTEM

## Disbursement

Mapping:
```text
0 ID
1 DATE_DISBURSEMENT
2 BANK_CODE
3 BANK_NO
4 ACCOUNT_NAME
5 AMOUNT
6 REF_ID
7 VENDOR_ID (tidak digunakan)
8 VENDOR_STATUS
```

REF_ID yang sudah ada akan di-update. `status_done` tidak di-reset.

## Balance

Mapping:
```text
0 ID
1 DATE CREATED
2 NOTE
3 CREDIT
4 DEBIT
5 BALANCE
```

Perhitungan biaya:
```text
sum_credit = credit yang tepat -1500
sum_debit  = debit yang tepat 1500
total_biaya = (sum_credit + sum_debit) * -1
```

## File yang perlu diupload/timpa

```text
xpay-full-cloudflare.html
xpay-full-cloudflare.css
xpay-full-cloudflare.js
app.js
styles.css
schema.sql
README.md
functions/api/[[path]].js
```

File Xpay lama boleh tetap ada, tetapi menu `Xpay Checker` V27 tidak memakainya.

Setelah deploy:

```text
Ctrl + Shift + R
```

Lalu cek:

```text
/api/health
```

Versi yang benar:

```text
v27-xpay-full-cloudflare
```
