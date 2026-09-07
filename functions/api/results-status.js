
const COOKIE_NAME = "thelastmoon_session";
const MENU_ID = "hasil-result";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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

async function requireSession(request, db) {
  const token = readCookie(
    request.headers.get("Cookie"),
    COOKIE_NAME
  );

  if (!token) {
    throw new Error("Sesi login habis.");
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
    throw new Error("Sesi login habis.");
  }

  if (Number(user.is_master) !== 1) {
    const permissions = safePermissions(
      user.permissions
    );

    if (!permissions.includes(MENU_ID)) {
      throw new Error(
        "Tidak memiliki akses Hasil Result."
      );
    }
  }

  return user;
}

async function ensureSchema(db) {
  await db.prepare(`
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
  `).run();
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) {
      return json({
        ok: false,
        error: "Binding D1 DB belum ditemukan."
      }, 500);
    }

    await ensureSchema(env.DB);
    await requireSession(request, env.DB);

    const totals = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(DISTINCT result_date) AS dates,
        MAX(updated_at) AS latestUpdatedAt,
        MAX(received_at) AS latestReceivedAt
      FROM lottery_results
    `).first();

    const latest = await env.DB.prepare(`
      SELECT
        display_name AS display,
        result_date AS date,
        result_time AS time,
        n1,
        updated_at AS updatedAt
      FROM lottery_results
      ORDER BY updated_at DESC
      LIMIT 1
    `).first();

    return json({
      ok: true,
      version: "v59-result-sync-diagnostics",
      total: Number(totals?.total || 0),
      dates: Number(totals?.dates || 0),
      latestUpdatedAt:
        Number(totals?.latestUpdatedAt || 0),
      latestReceivedAt:
        Number(totals?.latestReceivedAt || 0),
      latest: latest || null
    });
  } catch (error) {
    return json({
      ok: false,
      error: error?.message || String(error)
    }, 401);
  }
}
