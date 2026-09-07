const VERSION = "v34-memo-button-fix";
const COOKIE_NAME = "thelastmoon_session";
const MAX_JSON_BYTES = 1024 * 1024;

class AppError extends Error {
  constructor(status, message, stage = "") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.stage = stage;
  }
}

let memoSchemaReady = false;

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    if (!env.DB) {
      throw new AppError(
        500,
        "Binding database DB belum ditemukan.",
        "binding"
      );
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        throw new AppError(
          403,
          "Permintaan lintas situs ditolak.",
          "origin"
        );
      }
    }

    await ensureMemoSchema(env.DB);

    const user = await getSessionUser(request, env.DB);
    if (!user) {
      throw new AppError(
        401,
        "Sesi login habis. Silakan login ulang.",
        "session"
      );
    }

    requireMemoAccess(user);

    const action = String(
      url.searchParams.get("action") || "list"
    ).trim().toLowerCase();

    if (request.method === "GET" && action === "list") {
      return listMemos(env.DB);
    }

    if (request.method !== "POST") {
      throw new AppError(
        405,
        "Method tidak diizinkan.",
        "method"
      );
    }

    if (action === "create") return createMemo(request, env.DB, user);
    if (action === "update") return updateMemo(request, env.DB, user);
    if (action === "trash") return trashMemo(request, env.DB, user);
    if (action === "restore") return restoreMemo(request, env.DB, user);
    if (action === "delete") return deleteMemo(request, env.DB);
    if (action === "empty-trash") return emptyTrash(env.DB);

    throw new AppError(
      404,
      `Action MEMO tidak ditemukan: ${action}`,
      "action"
    );
  } catch (error) {
    console.error("MEMO API error:", error);

    if (error instanceof AppError) {
      return json({
        success: false,
        error: error.message,
        stage: error.stage || undefined,
        version: VERSION
      }, error.status);
    }

    return json({
      success: false,
      error: "Terjadi kesalahan pada MEMO server.",
      detail: safeErrorMessage(error),
      version: VERSION
    }, 500);
  }
}

async function ensureMemoSchema(db) {
  if (memoSchemaReady) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS memo_records (
      id INTEGER PRIMARY KEY,
      keyword TEXT NOT NULL,
      content TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      created_by INTEGER,
      updated_by INTEGER
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_memo_records_deleted_updated
      ON memo_records(deleted, updated_at DESC)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_memo_records_updated
      ON memo_records(updated_at DESC)`)
  ]);

  memoSchemaReady = true;
}

async function getSessionUser(request, db) {
  const rawToken = readCookie(
    request.headers.get("Cookie"),
    COOKIE_NAME
  );

  if (!rawToken) return null;

  const tokenHash = await sha256(rawToken);

  return db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.active = 1
    LIMIT 1
  `).bind(tokenHash, Date.now()).first();
}

function requireMemoAccess(user) {
  if (Number(user?.is_master) === 1) return;

  let permissions = [];

  try {
    permissions = JSON.parse(
      user?.permissions || "[]"
    );
  } catch (_) {
    permissions = [];
  }

  if (
    !Array.isArray(permissions) ||
    !permissions.includes("ai-chat")
  ) {
    throw new AppError(
      403,
      "Akun ini tidak memiliki akses MEMO.",
      "permission"
    );
  }
}

async function listMemos(db) {
  const result = await db.prepare(`
    SELECT
      id,
      keyword,
      content,
      deleted,
      created_at,
      updated_at,
      deleted_at,
      created_by,
      updated_by
    FROM memo_records
    ORDER BY updated_at DESC, id DESC
  `).all();

  return json({
    success: true,
    memos: (result.results || []).map(row => ({
      id: Number(row.id),
      keyword: String(row.keyword || ""),
      content: String(row.content || ""),
      deleted: Number(row.deleted) === 1,
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
      deletedAt:
        row.deleted_at == null
          ? null
          : Number(row.deleted_at),
      createdBy:
        row.created_by == null
          ? null
          : Number(row.created_by),
      updatedBy:
        row.updated_by == null
          ? null
          : Number(row.updated_by)
    }))
  });
}

async function createMemo(request, db, user) {
  const body = await readJson(request);
  const keyword = validateKeyword(body.keyword);
  const content = validateContent(body.content);
  const now = Date.now();

  const result = await db.prepare(`
    INSERT INTO memo_records (
      keyword,
      content,
      deleted,
      created_at,
      updated_at,
      deleted_at,
      created_by,
      updated_by
    )
    VALUES (?, ?, 0, ?, ?, NULL, ?, ?)
  `).bind(
    keyword,
    content,
    now,
    now,
    user.id,
    user.id
  ).run();

  return json({
    success: true,
    id: Number(result.meta?.last_row_id || 0)
  }, 201);
}

async function updateMemo(request, db, user) {
  const body = await readJson(request);
  const id = positiveId(body.id);
  const keyword = validateKeyword(body.keyword);
  const content = validateContent(body.content);

  const existing = await db.prepare(`
    SELECT id, deleted
    FROM memo_records
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();

  if (!existing) {
    throw new AppError(
      404,
      "Memo tidak ditemukan.",
      "update-not-found"
    );
  }

  if (Number(existing.deleted) === 1) {
    throw new AppError(
      409,
      "Memo berada di Recycle Bin. Pulihkan terlebih dahulu.",
      "update-trash"
    );
  }

  await db.prepare(`
    UPDATE memo_records
    SET
      keyword = ?,
      content = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
  `).bind(
    keyword,
    content,
    Date.now(),
    user.id,
    id
  ).run();

  return json({ success: true });
}

async function trashMemo(request, db, user) {
  const body = await readJson(request);
  const id = positiveId(body.id);
  const now = Date.now();

  const result = await db.prepare(`
    UPDATE memo_records
    SET
      deleted = 1,
      deleted_at = ?,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
  `).bind(
    now,
    now,
    user.id,
    id
  ).run();

  if (Number(result.meta?.changes || 0) === 0) {
    throw new AppError(
      404,
      "Memo tidak ditemukan.",
      "trash-not-found"
    );
  }

  return json({ success: true });
}

async function restoreMemo(request, db, user) {
  const body = await readJson(request);
  const id = positiveId(body.id);

  const result = await db.prepare(`
    UPDATE memo_records
    SET
      deleted = 0,
      deleted_at = NULL,
      updated_at = ?,
      updated_by = ?
    WHERE id = ?
  `).bind(
    Date.now(),
    user.id,
    id
  ).run();

  if (Number(result.meta?.changes || 0) === 0) {
    throw new AppError(
      404,
      "Memo tidak ditemukan.",
      "restore-not-found"
    );
  }

  return json({ success: true });
}

async function deleteMemo(request, db) {
  const body = await readJson(request);
  const id = positiveId(body.id);

  const result = await db.prepare(`
    DELETE FROM memo_records
    WHERE id = ?
      AND deleted = 1
  `).bind(id).run();

  if (Number(result.meta?.changes || 0) === 0) {
    throw new AppError(
      409,
      "Memo harus berada di Recycle Bin sebelum dihapus permanen.",
      "delete"
    );
  }

  return json({ success: true });
}

async function emptyTrash(db) {
  const result = await db.prepare(`
    DELETE FROM memo_records
    WHERE deleted = 1
  `).run();

  return json({
    success: true,
    deleted: Number(
      result.meta?.changes || 0
    )
  });
}

function validateKeyword(value) {
  const text = String(value || "").trim();

  if (!text) {
    throw new AppError(
      400,
      "Kata kunci belum diisi.",
      "keyword"
    );
  }

  if (text.length > 300) {
    throw new AppError(
      400,
      "Kata kunci maksimal 300 karakter.",
      "keyword-length"
    );
  }

  return text;
}

function validateContent(value) {
  const text = String(value || "").trim();

  if (!text) {
    throw new AppError(
      400,
      "Isi memo belum diisi.",
      "content"
    );
  }

  if (text.length > 200000) {
    throw new AppError(
      400,
      "Isi memo terlalu panjang.",
      "content-length"
    );
  }

  return text;
}

function positiveId(value) {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      400,
      "ID memo tidak valid.",
      "id"
    );
  }

  return id;
}

async function readJson(request) {
  const length = Number(
    request.headers.get("Content-Length") || 0
  );

  if (length > MAX_JSON_BYTES) {
    throw new AppError(
      413,
      "Data memo terlalu besar.",
      "request-size"
    );
  }

  try {
    return await request.json();
  } catch (_) {
    throw new AppError(
      400,
      "Format data memo tidak valid.",
      "request-json"
    );
  }
}

function readCookie(header, name) {
  const source = String(header || "");

  for (const part of source.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;

    const key = part.slice(0, index).trim();
    if (key !== name) continue;

    return decodeURIComponent(
      part.slice(index + 1).trim()
    );
  }

  return "";
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(
    String(value || "")
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return [...new Uint8Array(digest)]
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function safeErrorMessage(error) {
  return String(
    error?.message ||
    error ||
    "Unknown error"
  ).slice(0, 600);
}
