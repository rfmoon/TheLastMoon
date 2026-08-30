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

## V58 — Dedicated Result API Endpoints

- Fix `Endpoint tidak ditemukan` pada Hasil Result.
- Tidak lagi hanya bergantung pada catch-all `[[path]].js`.
- `functions/api/results.js` → `/api/results`.
- `functions/api/results/dates.js` → `/api/results/dates`.
- `functions/api/external/results.js` → `/api/external/results`.
- `functions/api/results-health.js` → `/api/results-health`.
- Dedicated functions membuat tabel `lottery_results` otomatis jika belum ada.
- Catch-all route tetap dipertahankan sebagai fallback.
- Health main: `v58-result-dedicated-endpoints`.

## V59 — Result Sync Diagnostics

- Tambah `/api/results-status` untuk melihat jumlah row yang benar-benar sudah masuk D1.
- Hasil Result menampilkan `Server` dan `Tanggal Server`.
- Jika server 0, halaman menjelaskan bahwa Extension belum POST data.
- Extension V3 mempunyai tombol `SET API` langsung di panel Luna.
- `TEST & SYNC` menguji scope `results:write` lalu langsung mengirim seluruh result.
- Status API tidak lagi dipotong pendek.
- Health: `v59-result-sync-diagnostics`.

## V60 — Server Source Result Test

- Tambah kolom link sumber di Hasil Result.
- Default: `https://luna34849.com/history/number`.
- `Test Server` membuktikan apakah Cloudflare dapat membuka link tanpa browser user.
- `Tarik Sekarang` mencoba membaca tabel result statis dan menyimpan maksimal 10 row ke D1.
- Diagnosis menampilkan HTTP, #pool-name, #isihistory, changeHistory, candidate URL history.
- `Aktif untuk Cron` menyimpan status untuk Worker cron terpisah.
- Endpoint cron: `POST /api/external/result-source-pull` dengan API key `results:write`.
- Health: `v60-server-source-test`.

## V61 — Master Source + Live Refresh + Copy All

- `Auto Source Result` hanya dapat dilihat dan dipakai akun `is_master = 1`.
- Backend `GET/PUT/POST /api/result-source` semuanya master-only.
- User non-master tidak melihat panel Auto Source Result sama sekali.
- Hasil Result mengecek perubahan D1 setiap 5 detik.
- Jika ada row baru/update, tabel dan tanggal otomatis diperbarui tanpa refresh manual.
- Fallback full refresh setiap 60 detik.
- Setiap kartu tanggal sekarang punya tombol `COPY ALL`.
- COPY ALL mengambil seluruh `resultText` pada tanggal tersebut.
- Health: `v61-master-source-live-refresh`.

## V62 — Browser Run Ready

- Diagnosis V61 membuktikan source Luna dinamis: `changeHistory` ada tetapi `Result statis = 0`.
- Tombol source sekarang menjelaskan bahwa fetch HTML biasa tidak dapat menjalankan AJAX market.
- Hasil Result tetap live-check D1 setiap 5 detik + fallback 60 detik.
- Gunakan `thelastmoon-result-browser-worker-v2.zip` untuk scan headless browser tanpa Chrome user dibuka.
- Health: `v62-browser-run-ready`.

## V63 — Auto Result Worker Clean UI
- Panel diagnosis HTML lama dihapus dari UI.
- Panel `Auto Result Browser Worker` hanya MASTER ADMINISTRATOR.
- Status Worker memakai `/health` nyata dari Browser Worker.
- Menampilkan ONLINE/ERROR, Auto Sync, Interval 10 menit, Last Sync, Market, Result, Tanggal.
- URL Worker bisa disimpan oleh Master.
- Backend `/api/result-worker-status` master-only.
- RUN_TOKEN tidak ditampilkan di TheLastMoon.
- Live stats tetap diperbarui setiap 5 detik.
- Health: `v63-auto-result-worker-clean`.
