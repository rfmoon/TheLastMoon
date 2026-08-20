# TheLastMoon V34 — MEMO Button Fix

Penyebab tombol MEMO V33 tidak bekerja ditemukan:

`_headers` menggunakan Content-Security-Policy:

```text
script-src 'self' https://cdn.jsdelivr.net
```

dan tidak mengizinkan inline JavaScript.

Script MEMO sumber masih memakai:

```html
onclick="saveMemo()"
onclick="toggleAllMemos()"
onclick="toggleRecycleBin()"
```

Akibatnya browser memblokir klik tombol.

V34 menghapus seluruh inline `onclick` dan menggantinya dengan
`addEventListener()` dari `memo.js`.

Yang sekarang aktif:

- SIMPAN
- RESET
- SEARCH
- LIHAT SEMUA / TUTUP SEMUA
- RECYCLE BIN / TUTUP RECYCLE BIN
- COPY
- EDIT
- HAPUS
- PULIHKAN
- HAPUS PERMANEN
- KOSONGKAN RECYCLE BIN

Database tetap Cloudflare D1:

```text
memo_records
```

Dedicated API tetap:

```text
functions/api/memos.js
```

File utama yang perlu ditimpa/upload:

```text
memo.html
memo.js
app.js
functions/api/memos.js
functions/api/[[path]].js
README.md
```

Setelah deploy:

```text
Ctrl + Shift + R
```

Health version:

```text
v34-memo-button-fix
```
