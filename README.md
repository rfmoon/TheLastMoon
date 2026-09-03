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

## V64 — Checker Leading Zero Fix

- `31445468`, `031445468`, `0031445468` dianggap rekening yang sama untuk pencarian.
- Exact Nama + Nomor tetap menjadi prioritas pertama.
- Nomor rekening canonical unik menjadi fallback untuk noise kecil pada nama.
- Zero-width character pada nama dibersihkan.
- Hasil menampilkan Nama/Nomor/Status asli dari sheet BANK.
- Kasus Tio Agustin dan leading-zero examples diuji.
- Checker cache: 64.0.0.
- Health: `v64-checker-leading-zero-fix`.

## V65 — Checker Account Only

- Checker MATCH hanya berdasarkan Nomor Rekening.
- Nama rekening tidak lagi dipakai untuk menentukan cocok/tidak.
- Leading zero tetap dianggap sama.
- Exact nomor diprioritaskan, lalu canonical nomor tanpa leading zero.
- Output Nama/Nomor/Status tetap mengikuti database BANK.
- Checker cache: 65.0.0.
- Health: `v65-checker-account-only`.

## V66 — Hasil Result Logical Dedupe

- Memperbaiki result tanggal lama yang tampil double.
- Identitas result sekarang `Pasaran Tampilan + Tanggal + Periode` (fallback Waktu bila periode kosong).
- `pool`, source, dan angka hadiah tidak lagi masuk primary logical key.
- Browser Worker + Tampermonkey tidak dapat membuat dua baris untuk draw yang sama.
- Jika angka result dikoreksi, baris lama di-update, bukan ditambah.
- API membersihkan key legacy saat result yang sama dikirim ulang.
- Query Hasil Result dan jumlah per tanggal melakukan dedupe saat baca, sehingga duplicate lama langsung tidak ditampilkan.
- Health: `v66-result-logical-dedupe`.

## V67 — Checker Account Number Only (Robust Paste)

- Checker match 100% hanya berdasarkan nomor rekening.
- Nama rekening dan bank tidak mempengaruhi match.
- Parser tidak lagi bergantung pada satu transaksi per baris.
- Seluruh nomor rekening 6–22 digit diekstrak dari text penuh, termasuk paste WhatsApp/Telegram yang menjadi satu baris panjang.
- Exact account diprioritaskan, lalu canonical account tanpa leading zero.
- `324401005035506` harus terbaca bila ada di sheet BANK meskipun nama input berbeda.
- `31445468` sama dengan `0031445468`; `690669587` sama dengan `0690669587`.
- Hasil tetap menampilkan Nama/Nomor/Status asli dari database BANK.
- Cache Checker: 67.0.0.
- Health: `v67-checker-account-number-only`.

## V68 — Checker BANK Full Range

- Checker selalu membaca tab bernama `BANK`, tidak lagi mengikuti `gid` dari link yang mungkin menunjuk tab lain.
- Google Sheets dibaca dengan range eksplisit `A1:C5000`.
- Query eksplisit `select A,B,C` agar seluruh database BANK terbaca termasuk data setelah baris kosong.
- Matching Checker tetap nomor rekening saja seperti V67.
- Leading zero tetap dianggap sama.
- Health: `v68-checker-bank-full-range`.

## V69 — Checker Link State Fix

- Memperbaiki status lama seperti `Berhasil membaca 142 rekening` yang tetap tampil saat input link dikosongkan.
- Master tidak lagi auto-load database jika server memang belum mempunyai link Checker.
- Menambahkan tombol `HAPUS LINK` untuk benar-benar menghapus link lama dari server.
- Mengosongkan link pada input tidak otomatis menghapus link server; UI sekarang menjelaskannya dengan jelas.
- Setelah HAPUS LINK, bankRows, counter, hasil checker, dan status database langsung dikosongkan.
- User biasa tetap dapat membaca BANK jika Master sudah menyimpan link.
- Full range BANK A1:C5000 dari V68 tetap dipakai.
- Matching tetap nomor rekening saja.
- Health: `v69-checker-link-state-fix`.

## V70 — Checker BANK A2:C Full Read

- Sheet yang dibaca selalu bernama `BANK`.
- Range persis `BANK!A2:C5000`.
- A = Nama Rekening, B = Nomor Rekening, C = Status.
- Pembacaan dilakukan per blok 500 baris agar data setelah baris kosong tidak terpotong.
- Yang wajib ada hanya kolom B (Nomor Rekening); A/C boleh kosong.
- Dedupe database hanya berdasarkan nomor rekening canonical.
- Matching Checker tetap 100% hanya berdasarkan nomor rekening.
- Status UI menampilkan jumlah rekening, raw account rows, dan jumlah blok yang berisi data.
- Health: `v70-checker-bank-a2c-full-read`.

## V71 — Checker Canonical Account Fix

- Memperbaiki error `canonicalCheckerAccount is not defined` pada V70.
- Menambahkan helper backend `canonicalCheckerAccount()`.
- Leading zero tetap dianggap sama.
- Pembacaan tetap persis `BANK!A2:C5000`.
- A = Nama Rekening, B = Nomor Rekening, C = Status.
- Matching tetap hanya Nomor Rekening.
- Health: `v71-checker-canonical-fix`.
