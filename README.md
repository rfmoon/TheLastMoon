# TheLastMoon V19 — Checker BANK Spreadsheet

Menu **Checker** sekarang menjalankan script Cek Status Rekening dari file terbaru.

Spreadsheet sudah ditetapkan langsung:

```text
https://docs.google.com/spreadsheets/d/1GgLZO1TvqT5ZCTi5JwdtBMkfiDVFDNdHCfbz4rLf8ag/edit?gid=1252132751#gid=1252132751
```

Tab yang dibaca memakai:

```text
gid=1252132751
```

Jadi user tidak perlu menempel link spreadsheet setiap kali membuka Checker.

## Cara kerja

Saat menu:

```text
Checker
```

dibuka:

1. Spreadsheet BANK otomatis dimuat.
2. Kolom A dibaca sebagai Nama Rekening.
3. Kolom B dibaca sebagai Nomor Rekening.
4. Kolom C dibaca sebagai Status/Keterangan.
5. User tinggal menempel daftar rekening dan menekan **CEK DATA**.

Nomor rekening dicocokkan lebih dulu berdasarkan nomor rekening. Nama rekening hanya menjadi fallback.

## File baru

```text
checker-bank.html
checker-bank.css
checker-bank.js
```

## File yang perlu ditimpa

```text
app.js
styles.css
_headers
README.md
functions/api/[[path]].js
```

Upload juga tiga file Checker baru di root repository.

## Penting

`_headers` V19 menambahkan:

```text
https://docs.google.com
```

ke `script-src` agar pembacaan Google Sheets GViz/JSONP tidak diblokir CSP.

Setelah deployment:

```text
Ctrl + Shift + R
```
