# TheLastMoon V48 — Checker BANK Flexible Match

Perbaikan Checker BANK.

Sheet BANK tetap dibaca:
A = Nama Rekening
B = Nomor Rekening
C = Status / Keterangan

Contoh database:
ROSITA | 213165145146 | REKENING (AKTIF)

Tempelan:
BCA ROSITA 213165145146

Sekarang terbaca.

Tambahan:
- Checker otomatis membaca Sheet BANK saat halaman dibuka.
- Setelah Master mengganti link Spreadsheet, database otomatis dibaca ulang.
- Format chat seperti:
  `BCA YUNITA TRIANA, N 46545465`
  dibersihkan menjadi nama `YUNITA TRIANA`.
- Nomor rekening dari Google Sheets lebih tahan jika terbaca:
  `213165145146`
  `213165145146.0`
  atau scientific notation.
- Match tetap berdasarkan Nama + Nomor Rekening.
- BANK pada tempelan tidak ikut dicocokkan karena Sheet BANK hanya A:B:C.

Contoh:
BCA ROSITA 213165145146
-> ROSITA + 213165145146
-> REKENING (AKTIF)

Setelah deploy:
Ctrl + Shift + R

Health:
v48-checker-flexible-match
