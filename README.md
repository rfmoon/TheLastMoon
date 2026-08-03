# TheLastMoon V6 Stable

Versi ini memperbaiki proses inisialisasi D1:

- Schema dibuat satu per satu, bukan `DB.batch()`.
- Nama kolom pengaturan dibuat lebih aman: `setting_key` dan `setting_value`.
- Ada endpoint diagnostik yang menunjukkan tahap error.
- Password master wajib minimal 8 karakter.
- Pesan error sekarang menunjukkan tahap yang gagal.
- Tersedia `schema.sql` untuk pemasangan manual bila diperlukan.

## File repository

```text
index.html
styles.css
app.js
_headers
schema.sql
functions/
└── api/
    └── [[path]].js
```

## Cara update

Timpa file berikut:

```text
index.html
styles.css
app.js
_headers
README.md
functions/api/[[path]].js
```

`schema.sql` boleh ikut di-upload. File itu tidak dieksekusi otomatis dan hanya sebagai cadangan.

## Tes setelah deployment

```text
https://thelastmoon.pages.dev/api/health
https://thelastmoon.pages.dev/api/session
https://thelastmoon.pages.dev/api/diagnostics
https://thelastmoon.pages.dev/api/public-settings
```

`/api/diagnostics` yang berhasil akan menampilkan:

```json
{
  "ok": true,
  "version": "v6-stable",
  "dbPing": true,
  "schemaReady": true,
  "users": 1,
  "masterReady": true,
  "masterUsername": "Rfxfly",
  "masterActive": true
}
```

## Password master

V6 mengharuskan `MASTER_PASSWORD` minimal 8 karakter. Bila secret sekarang kurang dari 8 karakter, ganti di:

```text
Cloudflare Pages → thelastmoon
→ Settings → Variables and secrets
```

Kemudian deploy ulang.

## Pemasangan schema manual

Hanya lakukan bila endpoint masih menyebut tahap `schema-*`:

1. Buka Cloudflare → D1 SQL Database.
2. Pilih `thelastmoon-users`.
3. Buka Console.
4. Salin isi `schema.sql`.
5. Tempel dan jalankan.
6. Deploy ulang atau buka `/api/session` kembali.
