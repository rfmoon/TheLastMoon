# TheLastMoon V47 — Data Pencairan Dual Format

Bagian `Data Pencairan` sekarang menerima 2 format.

Format lama:
NAMA | NOMOR REKENING | NOMINAL

Contoh:
Fabian Aditya 54564545454 25.000.000

Format baru:
NOMINAL | KODE BANK | NOMOR REKENING | NAMA

Contoh:
25.000.000    6    54564545454    Fabian Aditya

Format baru dapat ditempel dari Spreadsheet menggunakan TAB,
dan juga dapat terbaca jika dipisahkan spasi.

Alur:
1. Nama + nomor rekening tetap dicocokkan dengan database rekening.
2. Kode bank pada format baru divalidasi.
3. Hasil tetap memakai kode bank dari database master agar konsisten.
4. Output Copy dan Excel TIDAK berubah.

Excel tetap:
No
Amount
Bank Code
Bank Account
Bank Account Name

Format Excel tetap mengikuti Contoh1.xlsx:
- Calibri 11 regular
- tidak bold
- tidak ada filter
- tidak freeze
- Bank Account sebagai Text
- default nama file: Nama Excel.xlsx

Setelah deploy:
Ctrl + Shift + R

Health:
v47-data-pencairan-dual-format
