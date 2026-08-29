# TheLastMoon V53 — Generate Bukti / Script Baru

Script baru dari file terbaru dipakai.

Menu:
List Data -> Generate Bukti

Dropdown:
BCA
- Antar Bank
- Sesama BCA

Mapping:
SOURCE_1 -> Antar Bank
SOURCE_2 -> Sesama BCA

Isi SOURCE_1 dan SOURCE_2:
TIDAK DIUBAH.
Keduanya disimpan byte-for-byte setelah base64 decode.

SHA256 SOURCE_1:
6a8a5fd8d80373f04c0156c52bddb5ce04d392230c496580e383be315c0c83df

SHA256 SOURCE_2:
3df0f57b2c0ba61d89f28ecaf8ad25e73ec32be934885a61566a11cf1d3030b6

Wrapper hanya mengatur menu/dropdown dan menjalankan template dalam iframe sandbox.
Penanda PREVIEW berada di wrapper, bukan di dalam script asli.

Setelah deploy:
Ctrl + Shift + R

Health:
v53-generate-bukti-new-original-scripts
