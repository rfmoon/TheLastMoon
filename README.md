# TheLastMoon V51 — Generate Bukti BCA (Demo)

Perubahan menu:

List Data
→ Generate Bukti

ID menu tetap:
list-data

Jadi permission user lama tidak perlu diubah.

Di Generate Bukti tersedia:

BCA
- Antar Bank
- Sesama BCA

Mapping script upload:
- SCRIPT 1 → Antar Bank
- SCRIPT 2 → Sesama BCA

Karena template ini menyerupai bukti transaksi bank, versi integrasi
dibuat sebagai SIMULASI / DEMO dan setiap hasil memiliki watermark permanen:

SIMULASI / DEMO — BUKAN BUKTI TRANSFER

Watermark berada di dalam area struk sehingga ikut pada hasil Save Demo ke PC.

File baru:
generate-bukti.html
generate-bukti.css
generate-bukti.js
generate-bukti-antar-bank.html
generate-bukti-antar-bank.css
generate-bukti-antar-bank.js
generate-bukti-sesama-bca.html
generate-bukti-sesama-bca.css
generate-bukti-sesama-bca.js

Setelah deploy:
Ctrl + Shift + R

Health:
v51-generate-bukti-bca-demo
