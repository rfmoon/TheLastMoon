# TheLastMoon V7 Aurora Glass

V7 memperbaiki error menu Settings dan mengganti desain luar/dalam.

## Penyebab menu Settings gagal

Versi awal pernah membuat tabel:

```text
site_settings
- key
- value
```

Versi berikutnya mencoba membaca kolom:

```text
setting_key
setting_value
```

`CREATE TABLE IF NOT EXISTS` tidak mengubah struktur tabel lama, sehingga halaman Settings gagal saat menjalankan query.

V7 menggunakan tabel baru:

```text
app_settings
- name
- value
```

Background lama akan dicoba dipindahkan otomatis dari kedua bentuk tabel lama.

## Fitur tampilan

- Desain login baru.
- Dashboard, sidebar, kartu, tabel, dan modal baru.
- Glassmorphism lebih jelas.
- Master dapat mengganti link background HTTPS.
- Master dapat mengatur kegelapan overlay.
- Master dapat mengatur blur background.
- Pengaturan berlaku pada login dan dashboard semua akun.
- Background disimpan di D1.

## File yang harus ditimpa

```text
index.html
styles.css
app.js
_headers
README.md
schema.sql
functions/api/[[path]].js
```

## Cara memasang

1. Ekstrak ZIP V7.
2. Upload dan timpa file root di GitHub:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `_headers`
   - `README.md`
   - `schema.sql`
3. Buka `functions/api/[[path]].js` di GitHub.
4. Hapus seluruh kode lama.
5. Tempel seluruh kode file V7 dengan nama yang sama.
6. Commit ke branch `main`.
7. Tunggu deployment Cloudflare selesai.
8. Tekan `Ctrl + Shift + R`.

Tidak perlu menghapus database atau membuat akun master ulang.

## Tes

```text
https://thelastmoon.pages.dev/api/health
https://thelastmoon.pages.dev/api/session
https://thelastmoon.pages.dev/api/diagnostics
https://thelastmoon.pages.dev/api/public-settings
```

Hasil public settings awal:

```json
{
  "backgroundUrl": "",
  "overlay": 68,
  "blur": 0
}
```

## Mengganti background

Login sebagai master:

```text
Settings
→ masukkan link HTTPS
→ atur overlay
→ atur blur
→ Terapkan preview
→ Simpan untuk semua akun
```

Gunakan link yang langsung membuka gambar.
