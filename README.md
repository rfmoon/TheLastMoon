# TheLastMoon V52 — Generate Bukti Original Scripts

Perubahan menu:
List Data -> Generate Bukti

Dropdown:
BCA
- Antar Bank
- Sesama BCA

Mapping:
SOURCE_1 -> Antar Bank
SOURCE_2 -> Sesama BCA

PENTING:
Isi SOURCE_1 dan SOURCE_2 dari file yang diberikan user TIDAK DIUBAH.
Keduanya ditulis byte-for-byte setelah base64 decode.

SHA256 SOURCE_1:
6a8a5fd8d80373f04c0156c52bddb5ce04d392230c496580e383be315c0c83df

SHA256 SOURCE_2:
3df0f57b2c0ba61d89f28ecaf8ad25e73ec32be934885a61566a11cf1d3030b6

Untuk keamanan, template dijalankan dalam iframe sandbox tanpa izin download.
Jadi script asli tetap utuh, tetapi wrapper membatasi ekspor/download.

Setelah deploy:
Ctrl + Shift + R

Health:
v52-generate-bukti-original-scripts
