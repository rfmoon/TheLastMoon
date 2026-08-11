# TheLastMoon V16 — Pencairan XPAY New Script

Bagian **Pencairan → Pencairan XPAY** diganti menggunakan script terbaru user.

## Logika baru yang ikut masuk

- tampilan hasil Spreadsheet terbaru;
- tombol **Download Excel (.xlsx)**;
- hasil Excel berisi:
  - No
  - Amount
  - Bank Code
  - Bank Account
  - Bank Account Name
- `Bank Account` ditulis sebagai Text agar leading zero tetap aman;
- salin ke Spreadsheet tanpa header;
- parsing database dan transaksi mengikuti script terbaru.

## Database tetap bersama

Walaupun script sumber menggunakan localStorage, versi panel ini tetap mempertahankan requirement sebelumnya:

```text
Cloudflare D1
```

Jadi rekening yang ditambahkan satu user tetap muncul untuk user lain.

Tersedia juga:

```text
Sinkronkan Sekarang
```

dan auto-sync setiap 15 detik.

## File yang harus ditimpa

```text
pencairan-xpay.html
pencairan-xpay.css
pencairan-xpay.js
app.js
README.md
functions/api/[[path]].js
```

Setelah deployment berhasil:

```text
Ctrl + Shift + R
```
