const MENUS = Object.freeze([
  { id: "dashboard", label: "Dashboard", icon: "▦", always: true },
  { id: "checker", label: "Checker", icon: "✓", assignable: true },
  { id: "xpay-diff", label: "Cari Selisih XPAY", icon: "≠", assignable: true },
  { id: "pencairan", label: "Pencairan", icon: "⇄", assignable: true },
  { id: "pencairan-xpay", label: "Pencairan XPAY", icon: "▤", parentId: "pencairan", assignable: true },
  { id: "biaya", label: "Biaya", icon: "◈", assignable: true },
  { id: "list-data", label: "List Data", icon: "☷", assignable: true },
  { id: "hasil-result", label: "Hasil Result", icon: "◎", assignable: true },
  { id: "event-scatter", label: "EVENT SCATTER", icon: "✺", assignable: true },
  { id: "ai-chat", label: "AI Chat", icon: "✦", assignable: true },
  { id: "upload", label: "Upload", icon: "⇧", assignable: true },
  { id: "generate-api", label: "Generate API", icon: "⌘", masterOnly: true },
  { id: "settings", label: "Settings", icon: "⚙", masterOnly: true },
  { id: "user-admin", label: "User Admin", icon: "♙", masterOnly: true }
]);

const VERSION = "v21-checker-strict-match";
const COOKIE_NAME = "thelastmoon_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 60000;
const MAX_JSON_BYTES = 32 * 1024;

let schemaReady = false;

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    return await routeRequest(request, env, url);
  } catch (error) {
    console.error("TheLastMoon API error:", error);

    const externalRequest = new URL(request.url).pathname.startsWith("/api/external/");
    const externalHeaders = externalRequest ? externalCorsHeaders() : {};

    if (error instanceof AppError) {
      return json({
        error: error.message,
        stage: error.stage || undefined,
        version: VERSION
      }, error.status, externalHeaders);
    }

    return json({
      error: "Terjadi kesalahan pada server.",
      detail: safeErrorMessage(error),
      version: VERSION
    }, 500, externalHeaders);
  }
}

async function routeRequest(request, env, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      version: VERSION,
      dbBound: Boolean(env.DB),
      masterUsernameConfigured: Boolean(env.MASTER_USERNAME),
      masterPasswordConfigured: Boolean(env.MASTER_PASSWORD)
    });
  }

  if (!env.DB) {
    throw new AppError(
      500,
      "Binding database belum ditemukan. Tambahkan D1 binding dengan nama DB.",
      "binding"
    );
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      throw new AppError(403, "Permintaan lintas situs ditolak.", "origin");
    }
  }

  await initializeDatabase(env);

  if (url.pathname === "/api/diagnostics" && request.method === "GET") {
    const userCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first();
    const master = await env.DB.prepare(
      "SELECT id, username, active FROM users WHERE is_master = 1 LIMIT 1"
    ).first();

    return json({
      ok: true,
      version: VERSION,
      dbPing: true,
      schemaReady: true,
      users: Number(userCount?.total || 0),
      masterReady: Boolean(master),
      masterUsername: master?.username || null,
      masterActive: master ? Number(master.active) === 1 : false,
      appearance: await readAppearance(env.DB)
    });
  }

  if (url.pathname === "/api/public-settings" && request.method === "GET") {
    return json(await readAppearance(env.DB));
  }

  if (url.pathname.startsWith("/api/external/") && request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: externalCorsHeaders()
    });
  }

  if (url.pathname === "/api/external/all" && request.method === "GET") {
    const apiKey = await authenticateApiKey(
      request,
      env.DB,
      "all:read"
    );
    return externalAllData(env.DB, apiKey);
  }

  if (url.pathname === "/api/external/dashboard" && request.method === "GET") {
    const apiKey = await authenticateApiKey(
      request,
      env.DB,
      "dashboard:read"
    );
    return externalDashboard(env.DB, apiKey);
  }

  if (
    url.pathname === "/api/external/pencairan-xpay/accounts" &&
    request.method === "GET"
  ) {
    const apiKey = await authenticateApiKey(
      request,
      env.DB,
      "payout-accounts:read"
    );
    return externalPayoutAccounts(env.DB, apiKey);
  }

  if (url.pathname === "/api/session" && request.method === "GET") {
    const user = await getSessionUser(request, env.DB);
    return json({
      authenticated: Boolean(user),
      setupReady: true,
      user: user ? publicUser(user) : null,
      menus: user ? menusForUser(user) : []
    });
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    return login(request, env.DB);
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    return logout(request, env.DB);
  }

  const user = await getSessionUser(request, env.DB);
  if (!user) {
    throw new AppError(401, "Sesi login habis. Silakan masuk kembali.", "session");
  }

  if (url.pathname === "/api/change-password" && request.method === "POST") {
    return changePassword(request, env.DB, user);
  }

  if (url.pathname === "/api/api-keys" && request.method === "GET") {
    requireMaster(user);
    return listApiKeys(env.DB);
  }

  if (url.pathname === "/api/api-keys" && request.method === "POST") {
    requireMaster(user);
    return createApiKey(request, env.DB, user);
  }

  const apiKeyMatch = url.pathname.match(/^\/api\/api-keys\/(\d+)$/);
  if (apiKeyMatch && request.method === "DELETE") {
    requireMaster(user);
    return revokeApiKey(env.DB, Number(apiKeyMatch[1]));
  }

  if (url.pathname === "/api/event-scatter/dates" && request.method === "GET") {
    requireMenuAccess(user, "event-scatter");
    return listEventScatterDates(env.DB);
  }

  if (url.pathname === "/api/event-scatter" && request.method === "GET") {
    requireMenuAccess(user, "event-scatter");
    return getEventScatterDate(env.DB, url.searchParams.get("date") || "");
  }

  const eventScatterDateMatch = url.pathname.match(
    /^\/api\/event-scatter\/date\/(\d{4}-\d{2}-\d{2})$/
  );
  if (eventScatterDateMatch && request.method === "PUT") {
    requireMenuAccess(user, "event-scatter");
    return replaceEventScatterDate(
      request,
      env.DB,
      user,
      eventScatterDateMatch[1]
    );
  }

  if (eventScatterDateMatch && request.method === "DELETE") {
    requireMenuAccess(user, "event-scatter");
    return deleteEventScatterDate(
      env.DB,
      eventScatterDateMatch[1]
    );
  }

  if (url.pathname === "/api/users" && request.method === "GET") {
    return listUsers(env.DB, user);
  }

  if (url.pathname === "/api/users" && request.method === "POST") {
    return createUser(request, env.DB, user);
  }

  const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch && request.method === "PUT") {
    return updateUser(request, env.DB, user, Number(userMatch[1]));
  }
  if (userMatch && request.method === "DELETE") {
    return deleteUser(env.DB, user, Number(userMatch[1]));
  }

  if (url.pathname === "/api/settings/background" && request.method === "GET") {
    requireMaster(user);
    return json(await readAppearance(env.DB));
  }

  if (url.pathname === "/api/settings/background" && request.method === "PUT") {
    requireMaster(user);
    return updateBackground(request, env.DB, user);
  }

  if (url.pathname === "/api/pencairan-xpay/accounts" && request.method === "GET") {
    requireMenuAccess(user, "pencairan-xpay");
    return listPayoutAccounts(env.DB);
  }

  if (url.pathname === "/api/pencairan-xpay/accounts/bulk" && request.method === "POST") {
    requireMenuAccess(user, "pencairan-xpay");
    return upsertPayoutAccounts(request, env.DB, user);
  }

  if (url.pathname === "/api/pencairan-xpay/accounts" && request.method === "DELETE") {
    requireMenuAccess(user, "pencairan-xpay");
    return clearPayoutAccounts(env.DB);
  }

  const payoutAccountMatch = url.pathname.match(
    /^\/api\/pencairan-xpay\/accounts\/(\d+)$/
  );
  if (payoutAccountMatch && request.method === "DELETE") {
    requireMenuAccess(user, "pencairan-xpay");
    return deletePayoutAccount(
      env.DB,
      Number(payoutAccountMatch[1])
    );
  }

  const moduleMatch = url.pathname.match(/^\/api\/module\/([a-z0-9-]+)$/);
  if (moduleMatch && request.method === "GET") {
    return openModule(user, moduleMatch[1]);
  }

  throw new AppError(404, "Endpoint tidak ditemukan.", "routing");
}

async function initializeDatabase(env) {
  if (!schemaReady) {
    await runSetupStep("db-ping", async () => {
      const ping = await env.DB.prepare("SELECT 1 AS ok").first();
      if (Number(ping?.ok) !== 1) {
        throw new Error("Database tidak merespons SELECT 1.");
      }
    });

    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        username_norm TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT '[]',
        is_master INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        updated_by INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS payout_accounts (
        id INTEGER PRIMARY KEY,
        account TEXT NOT NULL UNIQUE,
        bank_code TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        account_name TEXT NOT NULL,
        created_by INTEGER,
        created_at INTEGER NOT NULL,
        updated_by INTEGER,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS event_scatter_rows (
        id TEXT PRIMARY KEY,
        event_date TEXT NOT NULL,
        row_order INTEGER NOT NULL DEFAULT 0,
        user_id TEXT NOT NULL DEFAULT '',
        period TEXT NOT NULL DEFAULT '',
        screenshot TEXT NOT NULL DEFAULT '',
        x_bet TEXT NOT NULL DEFAULT '',
        check_nominal TEXT NOT NULL DEFAULT '',
        prize_status INTEGER NOT NULL DEFAULT 0,
        scanner_status TEXT NOT NULL DEFAULT 'PENDING',
        updated_at INTEGER NOT NULL,
        updated_by INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_event_scatter_date_order
        ON event_scatter_rows(event_date, row_order)`,
      `CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        token_prefix TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        scopes TEXT NOT NULL DEFAULT '["dashboard:read"]',
        active INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        expires_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS idx_api_keys_active
        ON api_keys(active)`,
      `CREATE INDEX IF NOT EXISTS idx_payout_accounts_name
        ON payout_accounts(account_name)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`
    ];

    for (let index = 0; index < statements.length; index += 1) {
      await runSetupStep(`schema-${index + 1}`, async () => {
        await env.DB.prepare(statements[index]).run();
      });
    }

    await migrateLegacySettings(env.DB);
    schemaReady = true;
  }

  await ensureMaster(env);
}

async function ensureMaster(env) {
  const existingMaster = await runSetupStep("master-check", () =>
    env.DB.prepare("SELECT id FROM users WHERE is_master = 1 LIMIT 1").first()
  );

  if (existingMaster) return;

  const username = String(env.MASTER_USERNAME || "").trim();
  const password = String(env.MASTER_PASSWORD || "");

  if (!validUsername(username)) {
    throw new AppError(
      500,
      "MASTER_USERNAME tidak valid. Gunakan 3–40 karakter: huruf, angka, titik, garis bawah, atau minus.",
      "master-username"
    );
  }

  if (password.length < 8 || password.length > 128) {
    throw new AppError(
      500,
      "MASTER_PASSWORD harus 8–128 karakter.",
      "master-password"
    );
  }

  const passwordHash = await runSetupStep(
    "master-password-hash",
    () => hashPassword(password)
  );

  const now = Date.now();
  const usernameNorm = normalizeUsername(username);
  const permissions = JSON.stringify(assignableMenuIds());

  const existingUser = await runSetupStep("master-user-check", () =>
    env.DB.prepare(
      "SELECT id FROM users WHERE username_norm = ? LIMIT 1"
    ).bind(usernameNorm).first()
  );

  if (existingUser) {
    await runSetupStep("master-promote", () =>
      env.DB.prepare(`
        UPDATE users
        SET username = ?, password_hash = ?, permissions = ?,
            is_master = 1, active = 1, updated_at = ?
        WHERE id = ?
      `).bind(
        username,
        passwordHash,
        permissions,
        now,
        existingUser.id
      ).run()
    );
  } else {
    await runSetupStep("master-create", () =>
      env.DB.prepare(`
        INSERT INTO users
          (username, username_norm, password_hash, permissions,
           is_master, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `).bind(
        username,
        usernameNorm,
        passwordHash,
        permissions,
        now,
        now
      ).run()
    );
  }
}

async function runSetupStep(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    throw new AppError(
      500,
      `Gagal menyiapkan sistem pada tahap ${stage}: ${safeErrorMessage(error)}`,
      stage
    );
  }
}

async function login(request, db) {
  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    throw new AppError(400, "Username dan password wajib diisi.", "login-input");
  }

  const user = await db.prepare(
    "SELECT * FROM users WHERE username_norm = ? LIMIT 1"
  ).bind(normalizeUsername(username)).first();

  const valid = Boolean(
    user &&
    Number(user.active) === 1 &&
    await verifyPassword(password, user.password_hash)
  );

  if (!valid) {
    throw new AppError(401, "Username atau password salah.", "login-auth");
  }

  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .bind(now).run();

  await db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(tokenHash, user.id, expiresAt, now).run();

  return json(
    { user: publicUser(user), menus: menusForUser(user) },
    200,
    { "Set-Cookie": sessionCookie(rawToken, Math.floor(SESSION_TTL_MS / 1000)) }
  );
}

async function logout(request, db) {
  const token = readCookie(request.headers.get("Cookie"), COOKIE_NAME);

  if (token) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token)).run();
  }

  return json(
    { success: true },
    200,
    { "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` }
  );
}

async function getSessionUser(request, db) {
  const token = readCookie(request.headers.get("Cookie"), COOKIE_NAME);
  if (!token) return null;

  return await db.prepare(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.active = 1
    LIMIT 1
  `).bind(await sha256(token), Date.now()).first();
}

async function changePassword(request, db, user) {
  const body = await readJson(request);
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new AppError(400, "Password baru harus 8–128 karakter.", "password-input");
  }

  if (!await verifyPassword(currentPassword, user.password_hash)) {
    throw new AppError(400, "Password sekarang salah.", "password-check");
  }

  await db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
  ).bind(await hashPassword(newPassword), Date.now(), user.id).run();

  return json({ success: true });
}

async function listUsers(db, user) {
  requireMaster(user);

  const result = await db.prepare(`
    SELECT id, username, permissions, is_master, active, created_at, updated_at
    FROM users
    ORDER BY is_master DESC, username_norm ASC
  `).all();

  return json({
    users: (result.results || []).map(row => ({
      id: row.id,
      username: row.username,
      permissions: safePermissions(row.permissions),
      isMaster: Number(row.is_master) === 1,
      active: Number(row.active) === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  });
}

async function createUser(request, db, master) {
  requireMaster(master);

  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const permissions = sanitizePermissions(body.permissions);
  const active = body.active === false ? 0 : 1;

  if (!validUsername(username)) {
    throw new AppError(
      400,
      "Username harus 3–40 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau minus.",
      "create-user-username"
    );
  }

  if (password.length < 6 || password.length > 128) {
    throw new AppError(400, "Password harus 6–128 karakter.", "create-user-password");
  }

  const now = Date.now();

  try {
    const result = await db.prepare(`
      INSERT INTO users
        (username, username_norm, password_hash, permissions,
         is_master, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      username,
      normalizeUsername(username),
      await hashPassword(password),
      JSON.stringify(permissions),
      active,
      now,
      now
    ).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    if (safeErrorMessage(error).toLowerCase().includes("unique")) {
      throw new AppError(409, "Username tersebut sudah digunakan.", "create-user-duplicate");
    }
    throw error;
  }
}

async function updateUser(request, db, master, targetId) {
  requireMaster(master);

  const target = await db.prepare(
    "SELECT * FROM users WHERE id = ? LIMIT 1"
  ).bind(targetId).first();

  if (!target) {
    throw new AppError(404, "Akun tidak ditemukan.", "update-user-not-found");
  }
  if (Number(target.is_master) === 1) {
    throw new AppError(403, "Akun master tidak dapat diedit dari menu ini.", "update-master");
  }

  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const permissions = sanitizePermissions(body.permissions);
  const active = body.active === false ? 0 : 1;

  if (!validUsername(username)) {
    throw new AppError(400, "Format username tidak valid.", "update-user-username");
  }
  if (password && (password.length < 6 || password.length > 128)) {
    throw new AppError(400, "Password harus 6–128 karakter.", "update-user-password");
  }

  try {
    await db.prepare(`
      UPDATE users
      SET username = ?, username_norm = ?, password_hash = ?,
          permissions = ?, active = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      username,
      normalizeUsername(username),
      password ? await hashPassword(password) : target.password_hash,
      JSON.stringify(permissions),
      active,
      Date.now(),
      targetId
    ).run();

    if (!active) {
      await db.prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(targetId).run();
    }

    return json({ success: true });
  } catch (error) {
    if (safeErrorMessage(error).toLowerCase().includes("unique")) {
      throw new AppError(409, "Username tersebut sudah digunakan.", "update-user-duplicate");
    }
    throw error;
  }
}

async function deleteUser(db, master, targetId) {
  requireMaster(master);

  const target = await db.prepare(
    "SELECT is_master FROM users WHERE id = ? LIMIT 1"
  ).bind(targetId).first();

  if (!target) {
    throw new AppError(404, "Akun tidak ditemukan.", "delete-user-not-found");
  }
  if (Number(target.is_master) === 1) {
    throw new AppError(403, "Akun master tidak dapat dihapus.", "delete-master");
  }

  await db.prepare("DELETE FROM sessions WHERE user_id = ?")
    .bind(targetId).run();
  await db.prepare("DELETE FROM users WHERE id = ?")
    .bind(targetId).run();

  return json({ success: true });
}

async function migrateLegacySettings(db) {
  const currentList = await readAppSetting(db, "background_urls");
  if (currentList) return;

  let singleValue = await readAppSetting(db, "background_url");

  if (!singleValue) {
    try {
      const legacy = await db.prepare("SELECT value FROM site_settings WHERE key = 'background_url' LIMIT 1").first();
      singleValue = String(legacy?.value || "");
    } catch (_) {
      try {
        const legacy = await db.prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'background_url' LIMIT 1").first();
        singleValue = String(legacy?.setting_value || "");
      } catch (_) {
        singleValue = "";
      }
    }
  }

  const list = normalizeBackgroundUrls(singleValue ? [singleValue] : []);
  if (list.length) {
    await upsertAppSetting(db, "background_urls", JSON.stringify(list), null);
  }
}

async function updateBackground(request, db, user) {
  const body = await readJson(request);
  const backgroundUrls = normalizeBackgroundUrls(body.backgroundUrls || body.backgroundUrl || []);
  const overlay = clampInteger(body.overlay, 20, 90, 58);
  const blur = clampInteger(body.blur, 0, 20, 2);
  const slideSeconds = clampInteger(body.slideSeconds, 3, 60, 8);

  await upsertAppSetting(db, "background_urls", JSON.stringify(backgroundUrls), user.id);
  await upsertAppSetting(db, "appearance_overlay", String(overlay), user.id);
  await upsertAppSetting(db, "appearance_blur", String(blur), user.id);
  await upsertAppSetting(db, "background_slide_seconds", String(slideSeconds), user.id);

  return json({ success: true, backgroundUrls, backgroundUrl: backgroundUrls[0] || "", overlay, blur, slideSeconds });
}

async function readAppearance(db) {
  let backgroundUrls = [];
  const rawList = await readAppSetting(db, "background_urls");

  if (rawList) {
    try {
      backgroundUrls = normalizeBackgroundUrls(JSON.parse(rawList));
    } catch (_) {
      backgroundUrls = normalizeBackgroundUrls(String(rawList).split(/\n|,/));
    }
  }

  if (!backgroundUrls.length) {
    const single = await readAppSetting(db, "background_url");
    if (single) backgroundUrls = normalizeBackgroundUrls([single]);
  }

  const overlay = clampInteger(await readAppSetting(db, "appearance_overlay"), 20, 90, 58);
  const blur = clampInteger(await readAppSetting(db, "appearance_blur"), 0, 20, 2);
  const slideSeconds = clampInteger(await readAppSetting(db, "background_slide_seconds"), 3, 60, 8);

  return { backgroundUrls, backgroundUrl: backgroundUrls[0] || "", overlay, blur, slideSeconds };
}

async function readAppSetting(db, name) {
  const row = await db.prepare(`
    SELECT value
    FROM app_settings
    WHERE name = ?
    LIMIT 1
  `).bind(name).first();
  return String(row?.value || "");
}

async function upsertAppSetting(db, name, value, userId) {
  await db.prepare(`
    INSERT INTO app_settings (name, value, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).bind(name, String(value), Date.now(), userId).run();
}

function normalizeBackgroundUrls(input) {
  const values = Array.isArray(input) ? input : String(input || "").split(/\n|,/);
  const seen = new Set();
  const result = [];
  for (const raw of values) {
    const value = String(raw || "").trim();
    if (!value || seen.has(value)) continue;
    let parsed;
    try { parsed = new URL(value); } catch (_) { throw new AppError(400, `Format link background tidak valid: ${value}`, "background-url"); }
    if (parsed.protocol !== "https:") throw new AppError(400, `Link background wajib menggunakan HTTPS: ${value}`, "background-protocol");
    seen.add(value);
    result.push(value);
    if (result.length >= 20) break;
  }
  return result;
}

function clampInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}



const API_SCOPES = Object.freeze([
  "all:read",
  "dashboard:read",
  "payout-accounts:read"
]);

async function listApiKeys(db) {
  const result = await db.prepare(`
    SELECT
      id,
      name,
      token_prefix AS tokenPrefix,
      scopes,
      active,
      created_at AS createdAt,
      last_used_at AS lastUsedAt,
      expires_at AS expiresAt
    FROM api_keys
    ORDER BY created_at DESC
  `).all();

  return json({
    keys: (result.results || []).map(row => ({
      id: row.id,
      name: row.name,
      tokenPrefix: row.tokenPrefix,
      scopes: safeApiScopes(row.scopes),
      active: Number(row.active) === 1,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt || null,
      expiresAt: row.expiresAt || null
    }))
  });
}

async function createApiKey(request, db, user) {
  const body = await readJson(request);
  const name = String(body.name || "Dashboard Reader")
    .trim()
    .slice(0, 80);

  if (!name) {
    throw new AppError(
      400,
      "Nama API wajib diisi.",
      "api-key-name"
    );
  }

  // V18: setiap key baru adalah Universal Read API.
  // Tidak perlu memilih scope satu per satu.
  const scopes = ["all:read"];

  const allowedExpiryDays = new Set([0, 7, 30, 90, 365]);
  const requestedDays = Number(body.expiresDays || 0);
  const expiresDays = allowedExpiryDays.has(requestedDays)
    ? requestedDays
    : 0;

  const rawToken = `tlm_live_${randomToken(32)}`;
  const tokenHash = await sha256(rawToken);
  const tokenPrefix = rawToken.slice(0, 18);
  const now = Date.now();
  const expiresAt = expiresDays
    ? now + expiresDays * 24 * 60 * 60 * 1000
    : null;

  const result = await db.prepare(`
    INSERT INTO api_keys (
      name,
      token_prefix,
      token_hash,
      scopes,
      active,
      created_by,
      created_at,
      expires_at
    )
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    name,
    tokenPrefix,
    tokenHash,
    JSON.stringify(scopes),
    user.id,
    now,
    expiresAt
  ).run();

  return json({
    success: true,
    token: rawToken,
    key: {
      id: result.meta?.last_row_id,
      name,
      tokenPrefix,
      scopes,
      active: true,
      createdAt: now,
      lastUsedAt: null,
      expiresAt
    },
    warning: "Token lengkap hanya ditampilkan sekali. Simpan di tempat aman."
  }, 201);
}

async function revokeApiKey(db, id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(
      400,
      "ID API tidak valid.",
      "api-key-id"
    );
  }

  const existing = await db.prepare(
    "SELECT id, active FROM api_keys WHERE id = ? LIMIT 1"
  ).bind(id).first();

  if (!existing) {
    throw new AppError(
      404,
      "API key tidak ditemukan.",
      "api-key-not-found"
    );
  }

  await db.prepare(`
    UPDATE api_keys
    SET active = 0
    WHERE id = ?
  `).bind(id).run();

  return json({ success: true });
}

async function authenticateApiKey(request, db, requiredScope) {
  const authorization = String(
    request.headers.get("Authorization") || ""
  ).trim();

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AppError(
      401,
      "Authorization Bearer token wajib dikirim.",
      "api-key-missing"
    );
  }

  const rawToken = match[1].trim();
  if (!rawToken.startsWith("tlm_live_")) {
    throw new AppError(
      401,
      "Format API key tidak valid.",
      "api-key-format"
    );
  }

  const tokenHash = await sha256(rawToken);
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
  `).bind(tokenHash).first();

  if (!row || Number(row.active) !== 1) {
    throw new AppError(
      401,
      "API key tidak valid atau sudah dicabut.",
      "api-key-invalid"
    );
  }

  if (row.expiresAt && Number(row.expiresAt) <= Date.now()) {
    await db.prepare(
      "UPDATE api_keys SET active = 0 WHERE id = ?"
    ).bind(row.id).run();

    throw new AppError(
      401,
      "API key sudah kedaluwarsa.",
      "api-key-expired"
    );
  }

  const scopes = safeApiScopes(row.scopes);
  if (
    !scopes.includes("all:read") &&
    !scopes.includes(requiredScope)
  ) {
    throw new AppError(
      403,
      `API key tidak memiliki akses ${requiredScope}.`,
      "api-key-scope"
    );
  }

  await db.prepare(`
    UPDATE api_keys
    SET last_used_at = ?
    WHERE id = ?
  `).bind(Date.now(), row.id).run();

  return {
    id: row.id,
    name: row.name,
    scopes
  };
}

async function externalDashboard(db, apiKey) {
  const userStats = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN is_master = 1 THEN 1 ELSE 0 END) AS masters
    FROM users
  `).first();

  const payoutStats = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM payout_accounts
  `).first();

  const activeApiStats = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM api_keys
    WHERE active = 1
      AND (expires_at IS NULL OR expires_at > ?)
  `).bind(Date.now()).first();

  const operationalMenus = MENUS
    .filter(menu => !menu.masterOnly)
    .map(publicMenu);

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    version: VERSION,
    apiKey: {
      name: apiKey.name
    },
    dashboard: {
      system: {
        online: true,
        sessionHours: Math.round(SESSION_TTL_MS / 3600000)
      },
      users: {
        total: Number(userStats?.total || 0),
        active: Number(userStats?.active || 0),
        masters: Number(userStats?.masters || 0)
      },
      menus: {
        total: operationalMenus.length,
        items: operationalMenus
      },
      pencairanXpay: {
        accountCount: Number(payoutStats?.total || 0)
      },
      api: {
        activeKeys: Number(activeApiStats?.total || 0)
      },
      appearance: await readAppearance(db),
      eventScatter: {
        storage: "browser-indexeddb",
        readableViaServerApi: false
      }
    }
  }, 200, externalCorsHeaders());
}

async function externalPayoutAccounts(db, apiKey) {
  const result = await db.prepare(`
    SELECT
      bank_code AS bankCode,
      bank_name AS bankName,
      account_name AS name,
      account,
      updated_at AS updatedAt
    FROM payout_accounts
    ORDER BY bank_name ASC, account_name ASC, account ASC
  `).all();

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    version: VERSION,
    apiKey: {
      name: apiKey.name
    },
    total: (result.results || []).length,
    accounts: result.results || []
  }, 200, externalCorsHeaders());
}

function sanitizeApiScopes(value) {
  const requested = Array.isArray(value) ? value : [];
  const allowed = new Set(API_SCOPES);

  return [...new Set(
    requested.filter(scope => allowed.has(String(scope)))
  )];
}

function safeApiScopes(value) {
  try {
    const parsed = Array.isArray(value)
      ? value
      : JSON.parse(value || "[]");
    return sanitizeApiScopes(parsed);
  } catch (_) {
    return [];
  }
}

function externalCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}


async function externalAllData(db, apiKey) {
  const now = Date.now();

  const userResult = await db.prepare(`
    SELECT
      id,
      username,
      permissions,
      is_master AS isMaster,
      active,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM users
    ORDER BY is_master DESC, username_norm ASC
  `).all();

  const payoutResult = await db.prepare(`
    SELECT
      id,
      bank_code AS bankCode,
      bank_name AS bankName,
      account_name AS name,
      account,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM payout_accounts
    ORDER BY bank_name ASC, account_name ASC, account ASC
  `).all();

  const eventResult = await db.prepare(`
    SELECT
      id,
      event_date AS date,
      row_order AS "order",
      user_id AS userId,
      period,
      screenshot,
      x_bet AS xBet,
      check_nominal AS checkNominal,
      prize_status AS prizeStatus,
      scanner_status AS scannerStatus,
      updated_at AS updatedAt
    FROM event_scatter_rows
    ORDER BY event_date DESC, row_order ASC
    LIMIT 10000
  `).all();

  const apiResult = await db.prepare(`
    SELECT
      id,
      name,
      token_prefix AS tokenPrefix,
      scopes,
      active,
      created_at AS createdAt,
      last_used_at AS lastUsedAt,
      expires_at AS expiresAt
    FROM api_keys
    ORDER BY created_at DESC
  `).all();

  const eventRows = (eventResult.results || []).map(row => ({
    ...row,
    prizeStatus: Number(row.prizeStatus) === 1
  }));

  const eventDatesMap = new Map();
  for (const row of eventRows) {
    eventDatesMap.set(row.date, (eventDatesMap.get(row.date) || 0) + 1);
  }

  const users = (userResult.results || []).map(row => ({
    id: row.id,
    username: row.username,
    permissions: safePermissions(row.permissions),
    isMaster: Number(row.isMaster) === 1,
    active: Number(row.active) === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));

  const apiKeys = (apiResult.results || []).map(row => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: safeApiScopes(row.scopes),
    active:
      Number(row.active) === 1 &&
      (!row.expiresAt || Number(row.expiresAt) > now),
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt || null,
    expiresAt: row.expiresAt || null
  }));

  const operationalMenus = MENUS.map(menu => ({
    id: menu.id,
    label: menu.label,
    icon: menu.icon,
    parentId: menu.parentId || null,
    masterOnly: Boolean(menu.masterOnly),
    assignable: Boolean(menu.assignable),
    always: Boolean(menu.always)
  }));

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    version: VERSION,
    apiKey: {
      name: apiKey.name,
      access: "universal-read"
    },
    data: {
      dashboard: {
        system: {
          online: true,
          sessionHours: Math.round(SESSION_TTL_MS / 3600000)
        },
        counts: {
          users: users.length,
          activeUsers: users.filter(user => user.active).length,
          masters: users.filter(user => user.isMaster).length,
          menus: operationalMenus.length,
          payoutAccounts: (payoutResult.results || []).length,
          eventScatterRows: eventRows.length,
          activeApiKeys: apiKeys.filter(key => key.active).length
        }
      },

      users,

      menus: operationalMenus,

      appearance: await readAppearance(db),

      pencairanXpay: {
        total: (payoutResult.results || []).length,
        accounts: payoutResult.results || []
      },

      eventScatter: {
        storage: "cloudflare-d1-shared",
        total: eventRows.length,
        dates: [...eventDatesMap.entries()].map(([date, total]) => ({
          date,
          total
        })),
        rows: eventRows
      },

      apiKeys,

      workspaces: {
        checker: {
          persistentServerData: false,
          note: "Workspace ini tidak menyimpan data permanen di server."
        },
        xpayDiff: {
          persistentServerData: false,
          note: "Data tempelan Cari Selisih XPAY bersifat sementara di browser."
        },
        biaya: {
          persistentServerData: false
        },
        listData: {
          persistentServerData: false
        },
        hasilResult: {
          persistentServerData: false
        },
        aiChat: {
          persistentServerData: false
        },
        upload: {
          persistentServerData: false
        }
      }
    }
  }, 200, externalCorsHeaders());
}

async function listEventScatterDates(db) {
  const result = await db.prepare(`
    SELECT
      event_date AS date,
      COUNT(*) AS total,
      MAX(updated_at) AS updatedAt
    FROM event_scatter_rows
    GROUP BY event_date
    ORDER BY event_date DESC
  `).all();

  return json({
    dates: result.results || []
  });
}

async function getEventScatterDate(db, date) {
  validateEventScatterDate(date);

  const result = await db.prepare(`
    SELECT
      id,
      event_date AS date,
      row_order AS "order",
      user_id AS userId,
      period,
      screenshot,
      x_bet AS xBet,
      check_nominal AS checkNominal,
      prize_status AS prizeStatus,
      scanner_status AS scannerStatus,
      updated_at AS updatedAt
    FROM event_scatter_rows
    WHERE event_date = ?
    ORDER BY row_order ASC
  `).bind(date).all();

  return json({
    date,
    rows: (result.results || []).map(row => ({
      ...row,
      prizeStatus: Number(row.prizeStatus) === 1
    }))
  });
}

async function replaceEventScatterDate(request, db, user, date) {
  validateEventScatterDate(date);

  const body = await readJson(request);
  const input = Array.isArray(body.rows) ? body.rows : [];

  if (input.length > 500) {
    throw new AppError(
      400,
      "Maksimal 500 baris EVENT SCATTER per tanggal.",
      "event-scatter-limit"
    );
  }

  const normalized = input.map((row, index) => ({
    id: String(row?.id || "").trim().slice(0, 120) ||
      `event-${date}-${index}-${Date.now()}`,
    date,
    order: Number.isInteger(Number(row?.order))
      ? Number(row.order)
      : index,
    userId: String(row?.userId || "").trim().slice(0, 150),
    period: String(row?.period || "").trim().slice(0, 150),
    screenshot: String(row?.screenshot || "").trim().slice(0, 2000),
    xBet: String(row?.xBet || "").trim().slice(0, 100),
    checkNominal: String(row?.checkNominal || "").trim().slice(0, 100),
    prizeStatus: Boolean(row?.prizeStatus),
    scannerStatus:
      String(row?.scannerStatus || "").toUpperCase() === "DONE"
        ? "DONE"
        : "PENDING",
    updatedAt: Number(row?.updatedAt) || Date.now()
  }));

  await db.prepare(
    "DELETE FROM event_scatter_rows WHERE event_date = ?"
  ).bind(date).run();

  for (const row of normalized) {
    await db.prepare(`
      INSERT INTO event_scatter_rows (
        id,
        event_date,
        row_order,
        user_id,
        period,
        screenshot,
        x_bet,
        check_nominal,
        prize_status,
        scanner_status,
        updated_at,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      row.id,
      row.date,
      row.order,
      row.userId,
      row.period,
      row.screenshot,
      row.xBet,
      row.checkNominal,
      row.prizeStatus ? 1 : 0,
      row.scannerStatus,
      row.updatedAt,
      user.id
    ).run();
  }

  return json({
    success: true,
    date,
    total: normalized.length
  });
}

async function deleteEventScatterDate(db, date) {
  validateEventScatterDate(date);

  const count = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM event_scatter_rows
    WHERE event_date = ?
  `).bind(date).first();

  await db.prepare(
    "DELETE FROM event_scatter_rows WHERE event_date = ?"
  ).bind(date).run();

  return json({
    success: true,
    date,
    deleted: Number(count?.total || 0)
  });
}

function validateEventScatterDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    throw new AppError(
      400,
      "Tanggal EVENT SCATTER tidak valid.",
      "event-scatter-date"
    );
  }
}

async function listPayoutAccounts(db) {
  try {
    const result = await db.prepare(`
      SELECT
        id,
        bank_code AS bankCode,
        bank_name AS bankName,
        account_name AS name,
        account,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM payout_accounts
      ORDER BY bank_name ASC, account_name ASC, account ASC
    `).all();

    return json({
      accounts: result.results || [],
      total: (result.results || []).length,
      shared: true,
      version: VERSION
    });
  } catch (error) {
    throw new AppError(
      500,
      `Gagal membaca database Pencairan XPAY: ${safeErrorMessage(error)}`,
      "payout-accounts-list"
    );
  }
}

async function upsertPayoutAccounts(request, db, user) {
  const body = await readJson(request);
  const input = Array.isArray(body.accounts) ? body.accounts : [];

  if (!input.length) {
    throw new AppError(
      400,
      "Tidak ada database rekening yang dikirim.",
      "payout-accounts-empty"
    );
  }

  if (input.length > 1000) {
    throw new AppError(
      400,
      "Maksimal 1.000 rekening dalam sekali simpan.",
      "payout-accounts-limit"
    );
  }

  const normalized = [];
  const seen = new Set();
  let failed = 0;

  for (const item of input) {
    const bankCode = String(item?.bankCode || "").trim().slice(0, 20);
    const bankName = String(item?.bankName || "").trim().slice(0, 100);
    const accountName = String(item?.name || "").trim().slice(0, 150);
    const account = String(item?.account || "")
      .replace(/\D/g, "")
      .slice(0, 50);

    if (!bankCode || !bankName || !accountName || !account) {
      failed += 1;
      continue;
    }

    if (seen.has(account)) continue;
    seen.add(account);

    normalized.push({
      bankCode,
      bankName,
      accountName,
      account
    });
  }

  if (!normalized.length) {
    throw new AppError(
      400,
      "Semua data rekening tidak valid.",
      "payout-accounts-invalid"
    );
  }

  const placeholders = normalized.map(() => "?").join(",");
  const existingResult = await db.prepare(`
    SELECT account
    FROM payout_accounts
    WHERE account IN (${placeholders})
  `).bind(...normalized.map(item => item.account)).all();

  const existing = new Set(
    (existingResult.results || []).map(row => String(row.account))
  );

  const now = Date.now();
  let added = 0;
  let updated = 0;

  for (const item of normalized) {
    await db.prepare(`
      INSERT INTO payout_accounts (
        account,
        bank_code,
        bank_name,
        account_name,
        created_by,
        created_at,
        updated_by,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account) DO UPDATE SET
        bank_code = excluded.bank_code,
        bank_name = excluded.bank_name,
        account_name = excluded.account_name,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `).bind(
      item.account,
      item.bankCode,
      item.bankName,
      item.accountName,
      user.id,
      now,
      user.id,
      now
    ).run();

    if (existing.has(item.account)) updated += 1;
    else added += 1;
  }

  return json({
    success: true,
    added,
    updated,
    failed,
    totalProcessed: normalized.length
  });
}

async function deletePayoutAccount(db, id) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(
      400,
      "ID rekening tidak valid.",
      "payout-account-id"
    );
  }

  const existing = await db.prepare(
    "SELECT id FROM payout_accounts WHERE id = ? LIMIT 1"
  ).bind(id).first();

  if (!existing) {
    throw new AppError(
      404,
      "Data rekening tidak ditemukan.",
      "payout-account-not-found"
    );
  }

  await db.prepare(
    "DELETE FROM payout_accounts WHERE id = ?"
  ).bind(id).run();

  return json({ success: true });
}

async function clearPayoutAccounts(db) {
  const count = await db.prepare(
    "SELECT COUNT(*) AS total FROM payout_accounts"
  ).first();

  await db.prepare("DELETE FROM payout_accounts").run();

  return json({
    success: true,
    deleted: Number(count?.total || 0)
  });
}

function requireMenuAccess(user, menuId) {
  const menu = MENUS.find(item => item.id === menuId);
  if (!menu) {
    throw new AppError(404, "Menu tidak ditemukan.", "module-not-found");
  }

  if (!isMaster(user)) {
    const permissions = safePermissions(user.permissions);
    if (menu.masterOnly || (menu.assignable && !permissions.includes(menuId))) {
      throw new AppError(
        403,
        "Kamu tidak memiliki izin membuka menu ini.",
        "module-permission"
      );
    }
  }

  return menu;
}

function openModule(user, menuId) {
  const menu = requireMenuAccess(user, menuId);

  return json({
    success: true,
    module: menu.id,
    message: `Akses ke menu ${menu.label} diizinkan oleh server.`
  });
}

function requireMaster(user) {
  if (!isMaster(user)) {
    throw new AppError(403, "Fitur ini hanya dapat diakses master.", "master-required");
  }
}

function menusForUser(user) {
  if (isMaster(user)) return MENUS.map(publicMenu);

  const permissions = safePermissions(user.permissions);
  return MENUS
    .filter(menu => menu.always || (menu.assignable && permissions.includes(menu.id)))
    .map(publicMenu);
}

function publicMenu(menu) {
  return { id: menu.id, label: menu.label, icon: menu.icon, parentId: menu.parentId || null };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    isMaster: isMaster(user),
    active: Number(user.active) === 1
  };
}

function isMaster(user) {
  return Number(user?.is_master) === 1;
}

function assignableMenuIds() {
  return MENUS.filter(menu => menu.assignable).map(menu => menu.id);
}

function sanitizePermissions(value) {
  const allowed = new Set(assignableMenuIds());
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.filter(item => allowed.has(item)))];
}

function safePermissions(value) {
  try {
    return sanitizePermissions(JSON.parse(value || "[]"));
  } catch (_) {
    return [];
  }
}

function validUsername(username) {
  return /^[A-Za-z0-9._-]{3,40}$/.test(username);
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_JSON_BYTES) {
    throw new AppError(413, "Data terlalu besar.", "request-size");
  }

  try {
    return await request.json();
  } catch (_) {
    throw new AppError(400, "Format data tidak valid.", "request-json");
  }
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, iterationsText, saltText, hashText] = String(storedHash).split("$");
    if (algorithm !== "pbkdf2-sha256") return false;

    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) {
      return false;
    }

    const expected = fromBase64(hashText);
    const actual = await derivePassword(password, fromBase64(saltText), iterations);
    return constantTimeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );

  return new Uint8Array(bits);
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function randomToken(size) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function toBase64Url(bytes) {
  return toBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readCookie(header, name) {
  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function sessionCookie(token, maxAge) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function safeErrorMessage(error) {
  const text = String(error?.message || error || "Unknown error");
  return text.replace(/\s+/g, " ").slice(0, 300);
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

class AppError extends Error {
  constructor(status, message, stage = "") {
    super(message);
    this.status = status;
    this.stage = stage;
  }
}
