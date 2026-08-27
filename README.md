# TheLastMoon V45 — WD Bersih + Kotor Match Fix

Perbaikan pencocokan DATABASE NAMA WD BERSIH untuk status BERSIH dan KOTOR.

Contoh database:
BCA / RISDA AMELIA (KOTOR)
KAS BESAR DANAMON / IMAM MUSTAKIM ( BERSIH )

Data Pencairan:
RISDA AMELIA
IMAM MUSTAKIM

Sekarang format berikut dibersihkan hanya untuk MATCHING:
- (BERSIH)
- ( BERSIH )
- WD BERSIH
- (WD BERSIH)
- (KOTOR)
- ( KOTOR )
- WD KOTOR
- (WD KOTOR)
- [BERSIH]
- [KOTOR]

Teks asli database tetap dipertahankan untuk output Docs Qris.

Contoh:
BCA / RISDA AMELIA (KOTOR)
akan dicocokkan sebagai:
RISDA AMELIA

Data lama yang sudah tersimpan di D1 tidak perlu diinput ulang.

Setelah deploy:
Ctrl + Shift + R

Health:
v45-wd-bersih-kotor-match-fix
