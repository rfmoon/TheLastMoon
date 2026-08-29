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
