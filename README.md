# TheLastMoon V38 — Pencairan XPAY Docs Qris

Perubahan judul:
- Tambah Database Banyak Sekaligus -> Tambahkan Rekening Baru atau Hapus
- Tempel Data Transaksi -> Data Pencairan
- Konversi Data Rekening -> Data Pencairan ke Docs Qris

Tulisan KOLOM A / KOLOM B / KOLOM C dihapus dari tampilan.

Bagian Data Pencairan ke Docs Qris memakai logika WD Bersih Matcher. Database Nama WD Bersih disimpan di IndexedDB `WD_BERSIH_DATABASE`. Output: Kolom A = teks database lengkap, Kolom B = kosong, Kolom C = nominal angka.

Setelah deploy tekan Ctrl + Shift + R.

Health: v38-pencairan-docs-qris
