# TheLastMoon V18 — Universal API

Generate API sekarang tidak memakai pilihan scope satu per satu.

Setiap API key baru otomatis:

```text
SEMUA • READ ONLY
```

Gunakan satu endpoint:

```text
GET /api/external/all
```

Header:

```text
Authorization: Bearer tlm_live_xxxxxxxxx
```

## Data yang dibaca satu endpoint

- Dashboard / status sistem
- User Admin:
  - username
  - status aktif
  - master/non-master
  - hak akses menu
  - tanpa password/hash
- Semua menu dan struktur submenu
- Settings / background
- Database Pencairan XPAY
- EVENT SCATTER
- Metadata API key
- Ringkasan workspace lain

## EVENT SCATTER

V18 menambahkan sinkronisasi EVENT SCATTER ke Cloudflare D1.

IndexedDB browser masih dipakai sebagai cache lokal, tetapi data tanggal juga dikirim ke D1 sehingga:

- user/perangkat lain dapat membaca data yang sama;
- Universal API dapat membaca EVENT SCATTER;
- data lama IndexedDB akan dimigrasikan ke D1 saat tanggal tersebut dibuka.

## Contoh

```js
fetch("https://thelastmoon.pages.dev/api/external/all", {
  headers: {
    Authorization: "Bearer API_KEY_KAMU"
  }
})
  .then(r => r.json())
  .then(result => {
    console.log(result.data);
    console.log(result.data.eventScatter.rows);
  });
```

## Catatan

Workspace seperti Cari Selisih XPAY masih berupa data tempelan sementara di browser.
Karena tidak disimpan permanen di server, Universal API hanya mengembalikan status/capability untuk workspace tersebut, bukan isi tempelan sesaat.

## File yang perlu ditimpa

```text
app.js
styles.css
event-scatter.js
schema.sql
README.md
functions/api/[[path]].js
```

Setelah deployment:

```text
Ctrl + Shift + R
```

Buat API key baru di menu Generate API agar key memiliki akses Universal Read.
