
const COOKIE_NAME = "thelastmoon_session";
const MENU_ID = "hasil-result";

class ApiError extends Error {
  constructor(status, message, stage = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.stage = stage;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function readCookie(header, name) {
  const source = String(header || "");
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("=") || "");
    }
  }
  return "";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || ""))
  );

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safePermissions(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function ensureResultsSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS lottery_results (
        result_key TEXT PRIMARY KEY,
        pool TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL,
        periode TEXT NOT NULL DEFAULT '',
        result_date TEXT NOT NULL,
        result_time TEXT NOT NULL DEFAULT '',
        n1 TEXT NOT NULL,
        n2 TEXT NOT NULL DEFAULT '',
        n3 TEXT NOT NULL DEFAULT '',
        shio TEXT NOT NULL DEFAULT '',
        result_text TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'luna-extension',
        received_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_lottery_results_date_time
      ON lottery_results(result_date, result_time)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_lottery_results_display
      ON lottery_results(display_name, result_date)
    `)
  ]);
}

async function requireResultSession(request, db) {
  const token = readCookie(
    request.headers.get("Cookie"),
    COOKIE_NAME
  );

  if (!token) {
    throw new ApiError(
      401,
      "Sesi login habis. Silakan masuk kembali.",
      "session"
    );
  }

  const user = await db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.active = 1
    LIMIT 1
  `).bind(
    await sha256(token),
    Date.now()
  ).first();

  if (!user) {
    throw new ApiError(
      401,
      "Sesi login habis. Silakan masuk kembali.",
      "session"
    );
  }

  const isMaster = Number(user.is_master) === 1;

  if (!isMaster) {
    const permissions = safePermissions(user.permissions);

    if (!permissions.includes(MENU_ID)) {
      throw new ApiError(
        403,
        "Kamu tidak memiliki izin membuka Hasil Result.",
        "permission"
      );
    }
  }

  return user;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizeText(value, max = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeDigits(value, max = 6) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, max);
}

function normalizeResultRow(input) {
  const pool = normalizeText(input?.pool, 100);
  const display = normalizeText(
    input?.display || input?.market,
    100
  );
  const periode = normalizeText(input?.periode, 80);
  const date = String(input?.date || "").trim();
  const time = String(input?.time || "").trim();
  const n1 = normalizeDigits(input?.n1, 6);
  const n2 = normalizeDigits(input?.n2, 6);
  const n3 = normalizeDigits(input?.n3, 6);
  const shio = normalizeText(input?.shio, 30).toUpperCase();

  if (!display) {
    throw new ApiError(400, "Nama pasaran kosong.", "result-display");
  }

  if (!validDate(date)) {
    throw new ApiError(
      400,
      `Tanggal result tidak valid: ${date}`,
      "result-date"
    );
  }

  if (
    time &&
    !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(time)
  ) {
    throw new ApiError(
      400,
      `Waktu result tidak valid: ${time}`,
      "result-time"
    );
  }

  if (!n1) {
    throw new ApiError(
      400,
      `Result kosong untuk ${display}.`,
      "result-number"
    );
  }

  const resultKey = [
    pool,
    display,
    date,
    time,
    periode,
    n1,
    n2,
    n3
  ].join("|");

  return {
    resultKey,
    pool,
    display,
    periode,
    date,
    time,
    n1,
    n2,
    n3,
    shio,
    resultText: String(input?.resultText || "")
      .trim()
      .slice(0, 4000)
  };
}

async function authenticateResultApiKey(request, db, requiredScope) {
  const authorization = String(
    request.headers.get("Authorization") || ""
  ).trim();

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new ApiError(
      401,
      "Authorization Bearer token wajib dikirim.",
      "api-key-missing"
    );
  }

  const rawToken = match[1].trim();

  if (!rawToken.startsWith("tlm_live_")) {
    throw new ApiError(
      401,
      "Format API key tidak valid.",
      "api-key-format"
    );
  }

  const row = await db.prepare(`
    SELECT
      id,
      name,
      scopes,
      active,
      expires_at AS expiresAt
    FROM api_keys
    WHERE token_hash = ?
    LIMIT 1
  `).bind(
    await sha256(rawToken)
  ).first();

  if (!row || Number(row.active) !== 1) {
    throw new ApiError(
      401,
      "API key tidak valid atau sudah dicabut.",
      "api-key-invalid"
    );
  }

  if (
    row.expiresAt &&
    Number(row.expiresAt) <= Date.now()
  ) {
    throw new ApiError(
      401,
      "API key sudah kedaluwarsa.",
      "api-key-expired"
    );
  }

  let scopes = [];

  try {
    const parsed = JSON.parse(row.scopes || "[]");
    scopes = Array.isArray(parsed) ? parsed : [];
  } catch (_) {}

  const universalRead =
    requiredScope.endsWith(":read") &&
    scopes.includes("all:read");

  if (
    !scopes.includes(requiredScope) &&
    !universalRead
  ) {
    throw new ApiError(
      403,
      `API key tidak memiliki akses ${requiredScope}.`,
      "api-key-scope"
    );
  }

  await db.prepare(`
    UPDATE api_keys
    SET last_used_at = ?
    WHERE id = ?
  `).bind(
    Date.now(),
    row.id
  ).run();

  return row;
}

function selectSql(where = "") {
  return `
    SELECT
      result_key AS resultKey,
      pool,
      display_name AS display,
      periode,
      result_date AS date,
      result_time AS time,
      n1,
      n2,
      n3,
      shio,
      result_text AS resultText,
      source,
      received_at AS receivedAt,
      updated_at AS updatedAt
    FROM lottery_results
    ${where}
    ORDER BY result_date DESC, result_time DESC, display_name ASC
  `;
}

function errorResponse(error, headers = {}) {
  if (error instanceof ApiError) {
    return json(
      {
        error: error.message,
        stage: error.stage || undefined,
        dedicatedEndpoint: true
      },
      error.status,
      headers
    );
  }

  return json(
    {
      error: "Terjadi kesalahan pada server Result.",
      detail: String(error?.message || error),
      dedicatedEndpoint: true
    },
    500,
    headers
  );
}


export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders();

  try {
    if (!env.DB) {
      throw new ApiError(
        500,
        "Binding D1 DB belum ditemukan.",
        "binding"
      );
    }

    await ensureResultsSchema(env.DB);

    const key = await authenticateResultApiKey(
      request,
      env.DB,
      "results:read"
    );

    const url = new URL(request.url);
    const date = String(
      url.searchParams.get("date") || ""
    ).trim();

    if (date && !validDate(date)) {
      throw new ApiError(
        400,
        "Format tanggal harus YYYY-MM-DD.",
        "date"
      );
    }

    const result = date
      ? await env.DB.prepare(
          selectSql("WHERE result_date = ?") + " LIMIT 3000"
        ).bind(date).all()
      : await env.DB.prepare(
          selectSql("") + " LIMIT 3000"
        ).all();

    const rows = result.results || [];

    return json({
      ok: true,
      endpoint: "/api/external/results",
      dedicatedEndpoint: true,
      apiKey: key.name,
      date: date || null,
      total: rows.length,
      rows
    }, 200, headers);
  } catch (error) {
    return errorResponse(error, headers);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders();

  try {
    if (!env.DB) {
      throw new ApiError(
        500,
        "Binding D1 DB belum ditemukan.",
        "binding"
      );
    }

    await ensureResultsSchema(env.DB);

    const key = await authenticateResultApiKey(
      request,
      env.DB,
      "results:write"
    );

    let body;

    try {
      body = await request.json();
    } catch (_) {
      throw new ApiError(
        400,
        "Body JSON tidak valid.",
        "json"
      );
    }

    const inputRows = Array.isArray(body?.rows)
      ? body.rows
      : [];

    if (!inputRows.length) {
      return json({
        ok: true,
        endpoint: "/api/external/results",
        dedicatedEndpoint: true,
        received: 0,
        saved: 0,
        apiKey: key.name
      }, 200, headers);
    }

    if (inputRows.length > 500) {
      throw new ApiError(
        400,
        "Maksimal 500 result per request.",
        "batch"
      );
    }

    const rows = inputRows.map(normalizeResultRow);
    const now = Date.now();

    const statements = rows.map(row =>
      env.DB.prepare(`
        INSERT INTO lottery_results (
          result_key,
          pool,
          display_name,
          periode,
          result_date,
          result_time,
          n1,
          n2,
          n3,
          shio,
          result_text,
          source,
          received_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(result_key) DO UPDATE SET
          pool = excluded.pool,
          display_name = excluded.display_name,
          periode = excluded.periode,
          result_date = excluded.result_date,
          result_time = excluded.result_time,
          n1 = excluded.n1,
          n2 = excluded.n2,
          n3 = excluded.n3,
          shio = excluded.shio,
          result_text = excluded.result_text,
          source = excluded.source,
          updated_at = excluded.updated_at
      `).bind(
        row.resultKey,
        row.pool,
        row.display,
        row.periode,
        row.date,
        row.time,
        row.n1,
        row.n2,
        row.n3,
        row.shio,
        row.resultText,
        "luna-extension",
        now,
        now
      )
    );

    await env.DB.batch(statements);

    return json({
      ok: true,
      endpoint: "/api/external/results",
      dedicatedEndpoint: true,
      received: inputRows.length,
      saved: rows.length,
      apiKey: key.name,
      updatedAt: now
    }, 200, headers);
  } catch (error) {
    return errorResponse(error, headers);
  }
}
