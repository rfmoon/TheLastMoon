# TheLastMoon V10 — Cari Selisih XPAY

Perubahan utama:

- Warna tulisan, font, dan panel dibuat lebih seimbang serta terbaca di background terang/gelap.
- Ditambahkan workspace **Cari Selisih XPAY**.
- Workspace XPAY menggunakan logika checker XPAY / ZonaMain / Coin Admin yang diberikan pengguna.
- Menu baru termasuk dalam sistem hak akses pengguna.
- Master otomatis dapat mengaksesnya.
- User biasa harus dicentang akses **Cari Selisih XPAY** melalui User Admin.

## File baru

```text
xpay-checker.html
xpay-checker.css
xpay-checker.js
```

## File yang harus ditimpa/upload

```text
index.html
styles.css
app.js
_headers
README.md
schema.sql
xpay-checker.html
xpay-checker.css
xpay-checker.js
functions/api/[[path]].js
```

## Setelah deployment

1. Tekan `Ctrl + Shift + R`.
2. Login sebagai master.
3. Buka menu **Cari Selisih XPAY**.
4. Untuk memberi akses kepada akun lain, buka **User Admin**, edit akun, kemudian centang menu tersebut.

Data XPAY, ZonaMain, dan Coin Admin diproses di browser. Library XLSX dimuat dari jsDelivr.
