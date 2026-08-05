# TheLastMoon V14 — EVENT SCATTER

Versi ini menambahkan menu baru:

```text
EVENT SCATTER
```

Menu berada sebagai menu utama di sidebar dan tersedia dalam pengaturan hak akses akun.

## Fitur EVENT SCATTER

- data berdasarkan tanggal;
- riwayat tanggal tersimpan;
- tambah 10 baris;
- USER ID;
- PERIODE;
- SCREENSHOT PERIODE;
- x BET;
- SSCHECK NOMINAL;
- STATUS HADIAH;
- SCANNER PENDING/DONE;
- tiga kolom teks otomatis untuk PERIODE, NOMINAL, dan USER ID;
- simpan otomatis menggunakan IndexedDB browser.

## File baru

```text
event-scatter.html
event-scatter.css
event-scatter.js
```

## File yang harus ditimpa

```text
app.js
styles.css
README.md
functions/api/[[path]].js
```

Upload juga ketiga file baru di atas ke root repository.

## Hak akses akun lain

```text
User Admin
→ Edit akun
→ centang EVENT SCATTER
→ Simpan akun
```

## Catatan penyimpanan

EVENT SCATTER masih mengikuti logika sumber dan menyimpan data melalui IndexedDB browser. Jadi data mengikuti browser/perangkat yang digunakan, bukan otomatis sama di semua perangkat.
