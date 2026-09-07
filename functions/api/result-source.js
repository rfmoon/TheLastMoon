
const COOKIE_NAME = "thelastmoon_session";
const MENU_ID = "hasil-result";

class ApiError extends Error {
  constructor(status, message, stage = "") {
    super(message);
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

function readCookie(header, name) {
  const source = String(header || "");
  for (const part of source.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("=") || "");
  }
  return "";
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || ""))
  );
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
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

async function requireSession(request, db) {
  const token = readCookie(request.headers.get("Cookie"), COOKIE_NAME);
  if (!token) throw new ApiError(401, "Sesi login habis.", "session");

  const user = await db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.active = 1
    LIMIT 1
  `).bind(await sha256(token), Date.now()).first();

  if (!user) throw new ApiError(401, "Sesi login habis.", "session");

  if (Number(user.is_master) !== 1) {
    const permissions = safePermissions(user.permissions);
    if (!permissions.includes(MENU_ID)) {
      throw new ApiError(403, "Tidak memiliki akses Hasil Result.", "permission");
    }
  }

  return user;
}

function requireMaster(user) {
  if (Number(user.is_master) !== 1) {
    throw new ApiError(403, "Hanya Master yang dapat mengubah link sumber.", "master");
  }
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
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
    `),
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
        source TEXT NOT NULL DEFAULT 'server-source',
        received_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  ]);

  const exists = await db.prepare(`
    SELECT id FROM result_source_settings WHERE id = 1
  `).first();

  if (!exists) {
    await db.prepare(`
      INSERT INTO result_source_settings (
        id, source_url, enabled, updated_at
      )
      VALUES (1, ?, 0, ?)
    `).bind(
      "https://luna34849.com/history/number",
      Date.now()
    ).run();
  }
}

function cleanText(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value, max = 6) {
  return String(value ?? "").replace(/\D/g, "").slice(0, max);
}

function shioOf(value) {
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
  const s = normalizeDigits(value, 6);
  return s ? (SHIO[s.slice(-2).padStart(2, "0")] || "") : "";
}

function extractSelectedMarket(html) {
  const select = String(html || "").match(
    /<select\b[^>]*id=["']pool-name["'][^>]*>([\s\S]*?)<\/select>/i
  );

  if (select) {
    const selected = select[1].match(
      /<option\b[^>]*selected[^>]*>([\s\S]*?)<\/option>/i
    );
    if (selected) return cleanText(selected[1]).replace(/\s+POOL$/i, "").trim();

    const first = select[1].match(
      /<option\b[^>]*>([\s\S]*?)<\/option>/i
    );
    if (first) return cleanText(first[1]).replace(/\s+POOL$/i, "").trim();
  }

  const heading = String(html || "").match(
    /([A-Z0-9][A-Z0-9 _-]{2,40})\s+POOL/i
  );

  return heading ? cleanText(heading[1]) : "SERVER DEFAULT";
}

function parseStaticRows(html, market) {
  const rows = [];
  const tbodyBlocks = [...String(html || "").matchAll(
    /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/gi
  )];

  for (const tbody of tbodyBlocks) {
    for (const tr of tbody[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => cleanText(m[1]));

      if (cells.length < 4) continue;

      const dateIdx = cells.findIndex(v => /^\d{4}-\d{2}-\d{2}$/.test(v));
      if (dateIdx < 0) continue;

      let time = "";
      let resultStart = dateIdx + 1;

      if (/^\d{1,2}:\d{2}:\d{2}$/.test(cells[dateIdx + 1] || "")) {
        time = cells[dateIdx + 1];
        resultStart = dateIdx + 2;
      } else {
        const same = String(cells[dateIdx]).match(/(\d{1,2}:\d{2}:\d{2})/);
        if (same) time = same[1];
      }

      const nums = [];
      for (let i = resultStart; i < cells.length; i++) {
        if (/^\d{1,6}$/.test(cells[i])) nums.push(cells[i]);
      }

      if (!nums.length) continue;

      const n1 = nums[0] || "";
      const n2 = nums[1] || "";
      const n3 = nums[2] || "";
      const periode = String(cells[0] || "").trim();

      rows.push({
        pool: market,
        display: market,
        periode,
        date: cells[dateIdx],
        time,
        n1,
        n2,
        n3,
        shio: shioOf(n1)
      });

      if (rows.length >= 10) return rows;
    }
  }

  return rows;
}

function buildResultText(row) {
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

async function saveRows(db, rows) {
  if (!rows.length) return 0;
  const now = Date.now();

  const statements = rows.map(row => {
    const key = [
      row.pool,
      row.display,
      row.date,
      row.time,
      row.periode,
      row.n1,
      row.n2,
      row.n3
    ].join("|");

    return db.prepare(`
      INSERT INTO lottery_results (
        result_key, pool, display_name, periode,
        result_date, result_time, n1, n2, n3,
        shio, result_text, source, received_at, updated_at
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
      key,
      row.pool,
      row.display,
      row.periode,
      row.date,
      row.time,
      row.n1,
      row.n2,
      row.n3,
      row.shio,
      buildResultText(row),
      "server-source",
      now,
      now
    );
  });

  await db.batch(statements);
  return rows.length;
}

async function fetchSource(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch (_) {
    throw new ApiError(400, "Link sumber tidak valid.", "source-url");
  }

  if (parsed.protocol !== "https:") {
    throw new ApiError(400, "Link sumber wajib HTTPS.", "source-protocol");
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TheLastMoonResultBot/1.0)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  const text = await response.text();

  const scriptSources = [...text.matchAll(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi
  )].map(m => m[1]).slice(0, 40);

  const historyCandidates = [...new Set(
    [...text.matchAll(/["']([^"']*history[^"']*)["']/gi)]
      .map(m => m[1])
      .filter(v => v.length < 240)
  )].slice(0, 30);

  const market = extractSelectedMarket(text);
  const rows = parseStaticRows(text, market);

  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type") || "",
    htmlLength: text.length,
    hasPoolName: /id=["']pool-name["']/i.test(text),
    hasIsiHistory: /id=["']isihistory["']/i.test(text),
    hasChangeHistory: /\bchangeHistory\b/i.test(text),
    scriptSources,
    historyCandidates,
    market,
    rows,
    htmlPreview: cleanText(text).slice(0, 500)
  };
}

function errorResponse(error) {
  if (error instanceof ApiError) {
    return json({
      ok: false,
      error: error.message,
      stage: error.stage
    }, error.status);
  }

  return json({
    ok: false,
    error: "Gagal memproses sumber.",
    detail: error?.message || String(error)
  }, 500);
}


export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) throw new ApiError(500, "Binding D1 DB belum ada.", "binding");

    await ensureSchema(env.DB);
    const user = await requireSession(request, env.DB);
    requireMaster(user);

    const row = await env.DB.prepare(`
      SELECT
        source_url AS sourceUrl,
        enabled,
        last_test_at AS lastTestAt,
        last_test_ok AS lastTestOk,
        last_test_message AS lastTestMessage,
        last_pull_at AS lastPullAt,
        last_pull_saved AS lastPullSaved,
        updated_at AS updatedAt
      FROM result_source_settings
      WHERE id = 1
      LIMIT 1
    `).first();

    return json({
      ok: true,
      isMaster: Number(user.is_master) === 1,
      config: row || null
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    if (!env.DB) throw new ApiError(500, "Binding D1 DB belum ada.", "binding");

    await ensureSchema(env.DB);
    const user = await requireSession(request, env.DB);
    requireMaster(user);

    const body = await request.json();
    const sourceUrl = String(body?.sourceUrl || "").trim();
    const enabled = body?.enabled ? 1 : 0;

    let parsed;
    try {
      parsed = new URL(sourceUrl);
    } catch (_) {
      throw new ApiError(400, "Link sumber tidak valid.", "source-url");
    }

    if (parsed.protocol !== "https:") {
      throw new ApiError(400, "Link sumber wajib HTTPS.", "source-protocol");
    }

    await env.DB.prepare(`
      UPDATE result_source_settings
      SET
        source_url = ?,
        enabled = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = 1
    `).bind(
      parsed.toString(),
      enabled,
      user.id,
      Date.now()
    ).run();

    return json({
      ok: true,
      sourceUrl: parsed.toString(),
      enabled: Boolean(enabled)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) throw new ApiError(500, "Binding D1 DB belum ada.", "binding");

    await ensureSchema(env.DB);
    const user = await requireSession(request, env.DB);
    requireMaster(user);

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "test").trim().toLowerCase();

    const cfg = await env.DB.prepare(`
      SELECT source_url AS sourceUrl
      FROM result_source_settings
      WHERE id = 1
      LIMIT 1
    `).first();

    const sourceUrl = String(cfg?.sourceUrl || "").trim();
    if (!sourceUrl) throw new ApiError(400, "Link sumber belum diisi.", "source-empty");

    const result = await fetchSource(sourceUrl);
    const now = Date.now();

    if (action === "pull") {
      const saved = await saveRows(env.DB, result.rows);

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
        result.ok ? 1 : 0,
        result.rows.length
          ? `Server membaca ${result.rows.length} baris statis.`
          : "Halaman terambil, tetapi tabel result statis belum ditemukan.",
        now,
        saved,
        now
      ).run();

      return json({
        ok: true,
        action: "pull",
        saved,
        source: result
      });
    }

    await env.DB.prepare(`
      UPDATE result_source_settings
      SET
        last_test_at = ?,
        last_test_ok = ?,
        last_test_message = ?,
        updated_at = ?
      WHERE id = 1
    `).bind(
      now,
      result.ok ? 1 : 0,
      result.rows.length
        ? `Server dapat membaca ${result.rows.length} result statis.`
        : `HTTP ${result.status}; perlu cek AJAX/changeHistory untuk semua market.`,
      now
    ).run();

    return json({
      ok: true,
      action: "test",
      source: result
    });
  } catch (error) {
    return errorResponse(error);
  }
}
