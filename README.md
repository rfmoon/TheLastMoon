# TheLastMoon V5 Clean

Project baru untuk:

```text
thelastmoon.pages.dev
```

## Struktur yang wajib ada di root repository

```text
index.html
styles.css
app.js
_headers
functions/
└── api/
    └── [[path]].js
```

Jangan upload file ZIP ke repository. Jangan tambahkan `_worker.js`.

## Nama yang disarankan

```text
GitHub repository: TheLastMoon
Cloudflare Pages project: thelastmoon
D1 database: thelastmoon-users
D1 binding variable: DB
Production branch: main
```

## Cloudflare build settings

```text
Framework preset: None
Build command: exit 0
Build output directory: .
Root directory: kosong
```

## Variables and secrets

```text
MASTER_USERNAME = Rfxfly
MASTER_PASSWORD = buat sebagai Secret
```

Gunakan password kuat baru. Jangan tulis password di file GitHub.

## Tes setelah deployment dan binding selesai

```text
https://thelastmoon.pages.dev/api/health
https://thelastmoon.pages.dev/api/session
https://thelastmoon.pages.dev/api/public-settings
```

Hasil health yang benar memiliki:

```json
{
  "ok": true,
  "version": "v5-fixed",
  "dbBound": true,
  "masterUsernameConfigured": true,
  "masterPasswordConfigured": true
}
```

Setelah login sebagai master, buka menu Settings untuk menempel link background HTTPS.
