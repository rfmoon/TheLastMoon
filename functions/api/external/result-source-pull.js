
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



async function ensureSourceSettings(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS result_source_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      source_url TEXT NOT NULL DEFAULT 'https://luna34849.com/history/number',
      enabled INTEGER NOT NULL DEFAULT 0,
      last_test_at INTEGER,
      last_test_ok INTEGER,
      last_test_message TEXT NOT NULL DEFAULT '',
      last_pull_at INTEGER,
      last_pull_saved INTEGER NOT NULL DEFAULT 0,
      updated_by INTEGER,
      updated_at INTEGER NOT NULL
    )
  `).run();

  const row = await db.prepare(`
    SELECT id FROM result_source_settings WHERE id = 1
  `).first();

  if (!row) {
    await db.prepare(`
      INSERT INTO result_source_settings (id, source_url, enabled, updated_at)
      VALUES (1, ?, 0, ?)
    `).bind(
      "https://luna34849.com/history/number",
      Date.now()
    ).run();
  }
}

function stripTags(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function localShio(value) {
  const SHIO = {
    "01":"KUDA","13":"KUDA","25":"KUDA","37":"KUDA","49":"KUDA","61":"KUDA","73":"KUDA","85":"KUDA","97":"KUDA",
    "02":"ULAR","14":"ULAR","26":"ULAR","38":"ULAR","50":"ULAR","62":"ULAR","74":"ULAR","86":"ULAR","98":"ULAR",
    "03":"NAGA","15":"NAGA","27":"NAGA","39":"NAGA","51":"NAGA","63":"NAGA","75":"NAGA","87":"NAGA","99":"NAGA",
    "04":"KELINCI","16":"KELINCI","28":"KELINCI","40":"KELINCI","52":"KELINCI","64":"KELINCI","76":"KELINCI","88":"KELINCI","00":"KELINCI",
    "05":"HARIMAU","17":"HARIMAU","29":"HARIMAU","41":"HARIMAU","53":"HARIMAU","65":"HARIMAU","77":"HARIMAU","89":"HARIMAU",
    "06":"KERBAU","18":"KERBAU","30":"KERBAU","42":"KERBAU","54":"KERBAU","66":"KERBAU","78":"KERBAU","90":"KERBAU",
    "07":"TIKUS","19":"TIKUS","31":"TIKUS","43":"TIKUS","55":"TIKUS","67":"TIKUS","79":"TIKUS","91":"TIKUS",
    "08":"BABI","20":"BABI","32":"BABI","44":"BABI","56":"BABI","68":"BABI","80":"BABI","92":"BABI",
    "09":"ANJING","21":"ANJING","33":"ANJING","45":"ANJING","57":"ANJING","69":"ANJING","81":"ANJING","93":"ANJING",
    "10":"AYAM","22":"AYAM","34":"AYAM","46":"AYAM","58":"AYAM","70":"AYAM","82":"AYAM","94":"AYAM",
    "11":"MONYET","23":"MONYET","35":"MONYET","47":"MONYET","59":"MONYET","71":"MONYET","83":"MONYET","95":"MONYET",
    "12":"KAMBING","24":"KAMBING","36":"KAMBING","48":"KAMBING","60":"KAMBING","72":"KAMBING","84":"KAMBING","96":"KAMBING"
  };
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? (SHIO[digits.slice(-2).padStart(2,"0")] || "") : "";
}

function extractMarket(html) {
  const selected = String(html || "").match(
    /<option\b[^>]*selected[^>]*>([\s\S]*?)<\/option>/i
  );
  if (selected) return stripTags(selected[1]).replace(/\s+POOL$/i, "").trim();

  const h = String(html || "").match(/([A-Z0-9][A-Z0-9 _-]{2,40})\s+POOL/i);
  return h ? stripTags(h[1]) : "SERVER DEFAULT";
}

function parseRows(html, market) {
  const rows = [];

  for (const tbody of String(html || "").matchAll(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/gi)) {
    for (const tr of tbody[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => stripTags(m[1]));

      const dateIdx = cells.findIndex(v => /^\d{4}-\d{2}-\d{2}$/.test(v));
      if (dateIdx < 0) continue;

      let time = "";
      let start = dateIdx + 1;

      if (/^\d{1,2}:\d{2}:\d{2}$/.test(cells[dateIdx + 1] || "")) {
        time = cells[dateIdx + 1];
        start = dateIdx + 2;
      }

      const nums = [];
      for (let i = start; i < cells.length; i++) {
        if (/^\d{1,6}$/.test(cells[i])) nums.push(cells[i]);
      }
      if (!nums.length) continue;

      rows.push({
        pool: market,
        display: market,
        periode: String(cells[0] || ""),
        date: cells[dateIdx],
        time,
        n1: nums[0] || "",
        n2: nums[1] || "",
        n3: nums[2] || "",
        shio: localShio(nums[0] || "")
      });

      if (rows.length >= 10) return rows;
    }
  }

  return rows;
}

function localResultText(row) {
  const lines = [
    `Hasil Pengeluaran ${row.display}`,
    `Tanggal ${row.date}`,
    row.display
  ];
  if (row.n2 || row.n3) {
    lines.push(`Prize 1 : ${row.n1 || "-"}`);
    lines.push(`Prize 2 : ${row.n2 || "-"}`);
    lines.push(`Prize 3 : ${row.n3 || "-"}`);
    lines.push(`SHIO Prize 1 : ${row.shio || "-"}`);
  } else {
    lines.push(`Result : ${row.n1 || "-"}`);
    lines.push(`SHIO : ${row.shio || "-"}`);
  }
  lines.push("Selamat Kepada Pemenang, Salam JP");
  return lines.join("\n");
}

async function saveSourceRows(db, rows) {
  if (!rows.length) return 0;
  const now = Date.now();

  await db.batch(rows.map(row => {
    const key = [
      row.pool,row.display,row.date,row.time,row.periode,row.n1,row.n2,row.n3
    ].join("|");

    return db.prepare(`
      INSERT INTO lottery_results (
        result_key,pool,display_name,periode,result_date,result_time,
        n1,n2,n3,shio,result_text,source,received_at,updated_at
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(result_key) DO UPDATE SET
        pool=excluded.pool,
        display_name=excluded.display_name,
        periode=excluded.periode,
        result_date=excluded.result_date,
        result_time=excluded.result_time,
        n1=excluded.n1,
        n2=excluded.n2,
        n3=excluded.n3,
        shio=excluded.shio,
        result_text=excluded.result_text,
        source=excluded.source,
        updated_at=excluded.updated_at
    `).bind(
      key,row.pool,row.display,row.periode,row.date,row.time,
      row.n1,row.n2,row.n3,row.shio,localResultText(row),
      "server-cron",now,now
    );
  }));

  return rows.length;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders();

  try {
    if (!env.DB) throw new ApiError(500, "Binding D1 DB belum ada.", "binding");

    await ensureResultsSchema(env.DB);
    await ensureSourceSettings(env.DB);

    const key = await authenticateResultApiKey(
      request,
      env.DB,
      "results:write"
    );

    const cfg = await env.DB.prepare(`
      SELECT source_url AS sourceUrl, enabled
      FROM result_source_settings
      WHERE id = 1
      LIMIT 1
    `).first();

    if (!Number(cfg?.enabled)) {
      return json({
        ok: true,
        skipped: true,
        reason: "source-disabled",
        saved: 0
      }, 200, headers);
    }

    const sourceUrl = String(cfg?.sourceUrl || "").trim();
    if (!sourceUrl) throw new ApiError(400, "Link sumber kosong.", "source-empty");

    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheLastMoonResultBot/1.0)",
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    const html = await response.text();
    const market = extractMarket(html);
    const rows = parseRows(html, market);
    const saved = await saveSourceRows(env.DB, rows);
    const now = Date.now();

    await env.DB.prepare(`
      UPDATE result_source_settings
      SET
        last_test_at = ?,
        last_test_ok = ?,
        last_test_message = ?,
        last_pull_at = ?,
        last_pull_saved = ?,
        updated_at = ?
      WHERE id = 1
    `).bind(
      now,
      response.ok ? 1 : 0,
      rows.length
        ? `Cron membaca ${rows.length} result statis (${market}).`
        : `HTTP ${response.status}; tabel statis tidak ditemukan.`,
      now,
      saved,
      now
    ).run();

    return json({
      ok: true,
      apiKey: key.name,
      httpStatus: response.status,
      market,
      found: rows.length,
      saved
    }, 200, headers);
  } catch (error) {
    return errorResponse(error, headers);
  }
}
