# TheLastMoon V32 — MEMO Cloudflare D1

Menu **AI Chat** diubah tampilannya menjadi **MEMO**.

ID permission tetap `ai-chat` supaya user yang sebelumnya sudah memiliki akses AI Chat tidak kehilangan akses. Di User Admin label yang tampil sekarang `MEMO`.

## Database

MEMO sekarang tersimpan di Cloudflare D1, bukan IndexedDB browser.

```text
memo_records
```

Fitur:
- Tambah Memo
- Search keyword + isi
- Lihat Semua / Tutup Semua
- Copy
- Edit
- Recycle Bin
- Pulihkan
- Hapus Permanen
- Kosongkan Recycle Bin
- Database dipakai bersama user yang punya akses MEMO

## API internal

```text
GET    /api/memos
POST   /api/memos
PUT    /api/memos/:id
POST   /api/memos/:id/trash
POST   /api/memos/:id/restore
DELETE /api/memos/:id
DELETE /api/memos/trash
```

Semua endpoint membutuhkan login TheLastMoon + permission `ai-chat` (label MEMO).

## File baru

```text
memo.html
memo.css
memo.js
```

## File yang ditimpa/upload

```text
memo.html
memo.css
memo.js
app.js
styles.css
schema.sql
README.md
functions/api/[[path]].js
```

Setelah deploy:

```text
Ctrl + Shift + R
```

Health version:

```text
v32-memo-d1
```
