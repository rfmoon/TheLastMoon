# TheLastMoon V28 — Xpay Clean + Upload 2 File

Perbaikan:

- Xpay Checker memakai tabel baru `xpay28_*`, jadi sebelum upload semua total = 0.
- Data lama 168.199 transaksi tidak dibaca dan tidak dihapus.
- Migration massal V27 dihentikan; ini menghilangkan penyebab utama API 503 saat startup.
- Upload Transaction mendukung pilih 2 atau lebih file sekaligus.
- Upload Settlement juga mendukung beberapa file.
- Header SETTLEMENT/PARTNER ID/RECORD VALUE dideteksi berdasarkan nama kolom, bukan index tetap.
- Tanggal SETTLEMENT membaca ISO timestamp maupun DD/MM/YYYY.

Setelah deploy tekan Ctrl + Shift + R. Health version: `v28-xpay-clean-two-files`.
