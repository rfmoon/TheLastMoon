# TheLastMoon V13 — Pencairan XPAY Sync Status Fix

Penyebab tulisan merah dapat tetap terlihat:

- sinkronisasi sebelumnya pernah gagal;
- sinkronisasi berikutnya berhasil secara silent;
- tabel sudah terisi, tetapi pesan error lama tidak dibersihkan.

V13 memperbaiki hal tersebut.

## Perubahan

- Error lama otomatis hilang setelah sinkronisasi berhasil.
- Status sekarang menunjukkan:
  - database bersama aktif;
  - jumlah rekening;
  - waktu sinkronisasi terakhir.
- GET database mencoba ulang satu kali jika terjadi gangguan server sementara.
- Dua kegagalan auto-sync berurutan baru menampilkan peringatan merah.
- Pesan server sekarang menampilkan tahap dan detail error.
- Keterangan workspace diperbaiki dari local browser menjadi Cloudflare D1.

## File yang harus ditimpa

```text
app.js
pencairan-xpay.js
pencairan-xpay.css
README.md
functions/api/[[path]].js
```

File lain boleh ikut di-upload.

Setelah deployment:

```text
Ctrl + Shift + R
```
