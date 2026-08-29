# TheLastMoon V54 — Generate Bukti CSP Fix

Penyebab tampilan rusak:
TheLastMoon memakai CSP:
- style-src 'self'
- script-src 'self' https://cdn.jsdelivr.net

Sementara template user memakai:
- <style> inline
- <script> inline

Browser memblokir keduanya sehingga template tampil tanpa CSS/logic.

Perbaikan V54:
- CSS SOURCE_1 dipindah apa adanya ke generate-bukti-antar-bank.css
- JS SOURCE_1 dipindah apa adanya ke generate-bukti-antar-bank.js
- CSS SOURCE_2 dipindah apa adanya ke generate-bukti-sesama-bca.css
- JS SOURCE_2 dipindah apa adanya ke generate-bukti-sesama-bca.js
- HTML hanya diarahkan ke file CSS/JS lokal tersebut
- Tidak mengubah isi CSS/logic template
- Dropdown tetap:
  BCA
  - Antar Bank
  - Sesama BCA

Setelah deploy:
Ctrl + Shift + R

Health:
v54-generate-bukti-csp-fix

## V55 — Crosscheck Kode Bank Pencairan XPAY

- Lokasi: Pencairan XPAY → Tambahkan Rekening Baru atau Hapus.
- Tambahan panel `Crosscheck Kode Bank`.
- Input: `NOMINAL | KODE BANK | NOMOR REKENING | NAMA`.
- Sistem mencari data database berdasarkan nomor rekening; fallback nama exact jika unik.
- `✓` = kode sama dengan database.
- `✕` = kode berbeda.
- `?` = data tidak ditemukan / format salah.
- Menggunakan database rekening shared yang sudah ada; tidak membuat database baru.
- Health: `v55-crosscheck-kode-bank`.

## V56 — Hasil Result via Chrome Extension + API

- Chrome Extension mengadaptasi scanner `LUNA34849 AUTO RESULT MINI V4`.
- Auto scan tetap 10 detik.
- Result dikirim ke `POST /api/external/results`.
- API key khusus dibuat dari `Generate API → Generate API Extension Result`.
- Scope: `results:read`, `results:write`.
- Universal `all:read` tetap READ ONLY dan tidak dapat POST result.
- D1 table: `lottery_results`.
- Menu `Hasil Result` sekarang menampilkan data per tanggal dan auto-refresh 10 detik.
- Result duplikat di-upsert berdasarkan key pasaran/tanggal/waktu/periode/nomor.
- Health: `v56-hasil-result-api-extension`.

## V57 — Result History 10 Tanggal

- Extension V2 membaca 10 baris History Nomor per market.
- Parser diperbaiki untuk tabel dengan kolom Tanggal + Waktu terpisah.
- Hasil Result mempunyai 10 chip tanggal terbaru + dropdown tanggal.
- Klik tanggal untuk melihat result pada tanggal tersebut.
- API route tetap berada di `functions/api/[[path]].js`.
- `functions/api/RESULTS-API-INFO.txt` ditambahkan sebagai petunjuk lokasi route.
- API batch limit 500; Extension mengirim chunk 180 agar stabil.
- Health: `v57-result-history-10tanggal`.
