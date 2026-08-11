# TheLastMoon V17 — Generate API

Menu baru:

```text
Generate API
```

Menu ini hanya tampil untuk akun master.

## Fungsi

Master dapat membuat API key read-only untuk membaca data dashboard dari sistem lain.

Endpoint utama:

```text
GET /api/external/dashboard
```

Header:

```text
Authorization: Bearer tlm_live_xxxxxxxxx
```

Data dashboard yang dapat dibaca:

- status sistem;
- jumlah user;
- jumlah user aktif;
- jumlah master;
- daftar menu operasional;
- jumlah rekening Pencairan XPAY;
- jumlah API key aktif;
- setting background;
- versi aplikasi.

EVENT SCATTER belum ikut terbaca datanya karena data EVENT SCATTER masih tersimpan di IndexedDB browser.

## Optional Scope

Jika saat generate dicentang:

```text
Database Pencairan XPAY
```

API key juga dapat membuka:

```text
GET /api/external/pencairan-xpay/accounts
```

## Keamanan

- token lengkap hanya ditampilkan satu kali;
- server hanya menyimpan SHA-256 hash token;
- API eksternal bersifat read-only;
- key dapat dicabut kapan saja;
- masa berlaku dapat dipilih;
- password akun tidak pernah dikirim oleh endpoint external.

## File yang harus ditimpa

```text
app.js
styles.css
schema.sql
README.md
functions/api/[[path]].js
```

File lainnya boleh ikut di-upload.

Setelah deployment:

```text
Ctrl + Shift + R
```
