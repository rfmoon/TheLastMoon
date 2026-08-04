# TheLastMoon V11 — Pencairan XPAY

Versi ini menambahkan submenu baru:

```text
Pencairan
└── Pencairan XPAY
```

Workspace Pencairan XPAY memakai alat Database & Konversi Rekening:

- database rekening tanpa nominal;
- bank, kode bank, nama rekening, dan nomor rekening;
- transaksi ditempel bersama nominal;
- hasil siap disalin ke spreadsheet;
- database disimpan dengan localStorage browser.

## File baru

```text
pencairan-xpay.html
pencairan-xpay.css
pencairan-xpay.js
```

## File yang harus ditimpa

```text
app.js
styles.css
README.md
functions/api/[[path]].js
```

Upload juga semua file baru di atas.

## Hak akses

Master mendapat akses otomatis.

Untuk akun lain:

```text
User Admin
→ Edit akun
→ centang Pencairan › Pencairan XPAY
→ Simpan
```

## Sesudah upload

Tunggu deployment Cloudflare berhasil, kemudian tekan:

```text
Ctrl + Shift + R
```
