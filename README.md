# TheLastMoon V46 — WD KAS Status Match Fix

Penyebab kasus 20 data hanya 13 ketemu:
7 nama pertama memakai status KAS pada database, terutama `(KAS BERSIH)`.

Contoh:
KAS KECIL BCA / Ahmad Yani (KAS BERSIH)
Data Pencairan: Ahmad Yani

V45 masih membaca status KAS itu sebagai bagian nama.
V46 membuang status operasional hanya untuk MATCHING.

Status yang sekarang didukung:
- BERSIH
- WD BERSIH
- KOTOR
- WD KOTOR
- KAS BERSIH
- KAS KECIL
- KAS KECIL WD BERSIH
- MANUAL TAMPUNG HUB

Bentuk dengan tanda kurung/spasi juga didukung.

Contoh:
KAS BCA / Desi Nurul Hikmah ( KAS BERSIH )
=> match key: DESI NURUL HIKMAH

KAS KECIL BCA / Ahmad Yani (KAS BERSIH)
=> match key: AHMAD YANI

KAS BRI / ILHAM ( KAS KECIL WD BERSIH )
=> match key: ILHAM

Teks database asli tetap dipertahankan untuk output Docs Qris.
Data D1 lama tidak perlu diinput ulang.

Tes 20 data yang diberikan user:
20 / 20 match.

Setelah deploy:
Ctrl + Shift + R

Health:
v46-wd-kas-status-match-fix
