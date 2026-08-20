# TheLastMoon V33 — MEMO Save Fix

V33 memisahkan MEMO dari backend catch-all besar.

File baru WAJIB:

functions/api/memos.js

Semua operasi menggunakan endpoint exact:

GET  /api/memos?action=list
POST /api/memos?action=create
POST /api/memos?action=update
POST /api/memos?action=trash
POST /api/memos?action=restore
POST /api/memos?action=delete
POST /api/memos?action=empty-trash

Database tetap Cloudflare D1:

memo_records

Function MEMO sendiri akan membuat tabel/index jika belum ada.

Permission tetap ai-chat, tetapi label menu tetap MEMO.

Timpa/upload:

functions/api/memos.js
functions/api/[[path]].js
memo.html
memo.js
app.js
README.md

Setelah deploy tekan Ctrl + Shift + R.

Health version:
v33-memo-dedicated-api
