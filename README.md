# TheLastMoon V15 — EVENT SCATTER New Logic

EVENT SCATTER diganti seluruhnya menggunakan script terbaru yang diberikan user.

## Logika baru yang ikut masuk

- Saat fokus berada di kolom USER ID sebelah kanan;
- tekan Enter;
- fokus langsung pindah ke kolom PERIODE sebelah kanan pada baris berikutnya;
- jika sedang berada di baris paling akhir, sistem otomatis menambah satu baris baru.

Semua logika lama tetap ikut:

- penyimpanan IndexedDB browser;
- data per tanggal;
- riwayat tanggal;
- tambah 10 baris;
- STATUS HADIAH dan SCANNER saling mengikuti;
- paste banyak kolom;
- kolom output PERIODE, NOMINAL, dan USER ID.

## File yang harus ditimpa

```text
event-scatter.html
event-scatter.css
event-scatter.js
app.js
README.md
functions/api/[[path]].js
```

Setelah deployment berhasil:

```text
Ctrl + Shift + R
```
