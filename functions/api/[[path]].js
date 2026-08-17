const MENUS = Object.freeze([
  { id: "dashboard", label: "Dashboard", icon: "▦", always: true },
  { id: "checker", label: "Checker", icon: "✓", assignable: true },
  { id: "xpay-checker", label: "Xpay Checker", icon: "◫", assignable: true },
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

const VERSION = "v27-xpay-full-cloudflare";
const COOKIE_NAME = "thelastmoon_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 60000;
const MAX_JSON_BYTES = 1024 * 1024;

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

  if (url.pathname === "/api/checker-bank/config" && request.method === "GET") {
    requireMaster(user);
    return getCheckerBankConfig(env.DB);
  }

  if (url.pathname === "/api/checker-bank/config" && request.method === "PUT") {
    requireMaster(user);
    return updateCheckerBankConfig(request, env.DB, user);
  }

  if (url.pathname === "/api/checker-bank/data" && request.method === "GET") {
    requireMenuAccess(user, "checker");
    return readCheckerBankData(env.DB);
  }

  if (url.pathname === "/api/xpay-cloud") {
    requireMenuAccess(user, "xpay-checker");
    return handleXpayCloud(request, env.DB, user, url);
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
      `CREATE TABLE IF NOT EXISTS xpay_transactions (
        id INTEGER PRIMARY KEY,
        signature TEXT NOT NULL UNIQUE,
        transaction_id TEXT NOT NULL DEFAULT '',
        payment TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        payment_sec INTEGER NOT NULL DEFAULT 0,
        settlement_raw TEXT NOT NULL DEFAULT '',
        record_value REAL NOT NULL DEFAULT 0,
        record_fee REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'SUCCESS',
        member TEXT NOT NULL DEFAULT '',
        partner_id TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '',
        uploaded_by INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_transactions_date
        ON xpay_transactions(payment_date)`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_transactions_payment
        ON xpay_transactions(payment_date, payment_sec)`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_transactions_member
        ON xpay_transactions(member)`,
      `CREATE TABLE IF NOT EXISTS xpay_upload_history (
        batch_id TEXT PRIMARY KEY,
        filename TEXT NOT NULL DEFAULT '',
        file_type TEXT NOT NULL DEFAULT '',
        total_records INTEGER NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        uploaded_by TEXT NOT NULL DEFAULT '',
        uploaded_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS xpay_settlement_files (
        id INTEGER PRIMARY KEY,
        filename TEXT NOT NULL DEFAULT '',
        settlement_date TEXT NOT NULL,
        total_records INTEGER NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        uploaded_by TEXT NOT NULL DEFAULT '',
        uploaded_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_settlement_files_date
        ON xpay_settlement_files(settlement_date)`,
      `CREATE TABLE IF NOT EXISTS xpay_settlement_details (
        id INTEGER PRIMARY KEY,
        settlement_file_id INTEGER NOT NULL,
        partner_id TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        settlement_date TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_settlement_details_date
        ON xpay_settlement_details(settlement_date)`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_settlement_details_partner
        ON xpay_settlement_details(partner_id)`,
      `CREATE TABLE IF NOT EXISTS xpay_comparison_results (
        id INTEGER PRIMARY KEY,
        settlement_date TEXT NOT NULL,
        partner_id TEXT NOT NULL,
        expected_amount REAL NOT NULL DEFAULT 0,
        actual_amount REAL NOT NULL DEFAULT 0,
        difference REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT '',
        transaction_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(settlement_date, partner_id)
      )`,
      `CREATE TABLE IF NOT EXISTS xpay_disbursements (
        id INTEGER PRIMARY KEY,
        batch_id TEXT NOT NULL DEFAULT '',
        transaction_id TEXT NOT NULL DEFAULT '',
        date_disbursement TEXT NOT NULL,
        bank_code TEXT NOT NULL DEFAULT '',
        bank_no TEXT NOT NULL DEFAULT '',
        account_name TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL DEFAULT 0,
        ref_id TEXT NOT NULL UNIQUE,
        vendor_status TEXT NOT NULL DEFAULT 'pending',
        status_done INTEGER NOT NULL DEFAULT 0,
        updated_by TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_disbursements_date
        ON xpay_disbursements(date_disbursement)`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_disbursements_status
        ON xpay_disbursements(vendor_status, status_done)`,
      `CREATE TABLE IF NOT EXISTS xpay_disbursement_logs (
        id INTEGER PRIMARY KEY,
        disbursement_id INTEGER NOT NULL,
        ref_id TEXT NOT NULL,
        batch_id TEXT NOT NULL DEFAULT '',
        action_type TEXT NOT NULL,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT NOT NULL DEFAULT '',
        changed_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_disbursement_logs_ref
        ON xpay_disbursement_logs(ref_id, changed_at)`,
      `CREATE TABLE IF NOT EXISTS xpay_disbursement_marks (
        id INTEGER PRIMARY KEY,
        disbursement_id INTEGER NOT NULL,
        ref_id TEXT NOT NULL,
        marked_by TEXT NOT NULL DEFAULT '',
        note TEXT,
        marked_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS xpay_balance_history (
        id INTEGER PRIMARY KEY,
        signature TEXT NOT NULL UNIQUE,
        batch_id TEXT NOT NULL,
        record_id TEXT NOT NULL DEFAULT '',
        date_created TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        credit REAL NOT NULL DEFAULT 0,
        debit REAL NOT NULL DEFAULT 0,
        balance REAL NOT NULL DEFAULT 0,
        uploaded_by TEXT NOT NULL DEFAULT '',
        uploaded_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_balance_date
        ON xpay_balance_history(date_created)`,
      `CREATE INDEX IF NOT EXISTS idx_xpay_balance_batch
        ON xpay_balance_history(batch_id)`,
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

    await ensureXpayV24Schema(env.DB);
    await ensureXpayFullSchema(env.DB);
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




async function ensureXpayV24Schema(db) {
  const info = await db.prepare(
    "PRAGMA table_info(xpay_transactions)"
  ).all();

  const columns = new Set(
    (info.results || []).map(row => String(row.name || ""))
  );

  if (!columns.has("settlement_raw")) {
    await db.prepare(`
      ALTER TABLE xpay_transactions
      ADD COLUMN settlement_raw TEXT NOT NULL DEFAULT ''
    `).run();
  }
}


async function ensureXpayFullSchema(db) {
  const info = await db.prepare("PRAGMA table_info(xpay_transactions)").all();
  const columns = new Set((info.results || []).map(row => String(row.name || "")));

  const additions = [
    ["batch_id", "TEXT NOT NULL DEFAULT ''"],
    ["record_date", "TEXT NOT NULL DEFAULT ''"],
    ["net_amount", "REAL NOT NULL DEFAULT 0"],
    ["merchant", "TEXT NOT NULL DEFAULT ''"],
    ["payment_time", "TEXT NOT NULL DEFAULT ''"],
    ["settlement_type", "TEXT NOT NULL DEFAULT ''"],
    ["settlement_date", "TEXT NOT NULL DEFAULT ''"],
    ["vendor_id", "TEXT NOT NULL DEFAULT ''"],
    ["status_excel", "TEXT NOT NULL DEFAULT ''"],
    ["ticket", "TEXT NOT NULL DEFAULT ''"]
  ];

  for (const [name, type] of additions) {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE xpay_transactions ADD COLUMN ${name} ${type}`).run();
    }
  }

  await db.prepare(`
    UPDATE xpay_transactions
    SET
      batch_id = CASE WHEN batch_id = '' THEN 'legacy-v24' ELSE batch_id END,
      net_amount = CASE WHEN net_amount = 0 THEN record_value - record_fee ELSE net_amount END,
      payment_time = CASE WHEN payment_time = '' THEN payment ELSE payment_time END,
      settlement_type = CASE
        WHEN settlement_type = '' AND payment_sec >= 84600 THEN 'CUTOFF'
        WHEN settlement_type = '' THEN 'SETTLEMENT'
        ELSE settlement_type
      END,
      settlement_date = CASE
        WHEN settlement_date = '' AND payment_sec >= 84600 THEN date(payment_date, '+2 day')
        WHEN settlement_date = '' THEN date(payment_date, '+1 day')
        ELSE settlement_date
      END,
      status_excel = CASE WHEN status_excel = '' THEN status ELSE status_excel END
    WHERE batch_id = '' OR payment_time = '' OR settlement_type = '' OR settlement_date = ''
  `).run();

  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_xpay_full_settlement ON xpay_transactions(settlement_date, settlement_type)"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_xpay_full_batch ON xpay_transactions(batch_id)"
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_xpay_full_partner ON xpay_transactions(partner_id)"
  ).run();
}

async function handleXpayCloud(request, db, user, url) {
  const action = String(url.searchParams.get("action") || "").trim();

  if (request.method === "GET") {
    if (action === "summary") return xpaySummary(db);
    if (action === "get_batches") return xpayGetBatches(db);
    if (action === "check_settlement") return xpayCheckSettlement(db, url.searchParams.get("date") || "");
    if (action === "get_comparison") return xpayGetComparison(db, url.searchParams.get("date") || "");
    if (action === "get_transactions") return xpayGetTransactions(db);
    if (action === "get_disbursements") return xpayGetDisbursements(db, url);
    if (action === "get_disbursement_batches") return xpayGetDisbursementBatches(db);
    if (action === "get_disbursement_logs") return xpayGetDisbursementLogs(db, url.searchParams.get("ref_id") || "");
    if (action === "get_balance_history") return xpayGetBalanceHistory(db, url.searchParams.get("date") || "");
    if (action === "get_balance_batches") return xpayGetBalanceBatches(db);
  }

  if (request.method === "POST") {
    if (action === "upload_transactions_chunk") return xpayUploadTransactionsChunk(request, db, user);
    if (action === "upload_settlement_start") return xpaySettlementStart(request, db, user);
    if (action === "upload_settlement_chunk") return xpaySettlementChunk(request, db);
    if (action === "upload_settlement_finish") return xpaySettlementFinish(request, db, user);
    if (action === "delete_batch") return xpayDeleteBatch(request, db);
    if (action === "upload_disbursement_chunk") return xpayUploadDisbursementChunk(request, db, user);
    if (action === "finish_disbursement_upload") return xpayFinishDisbursementUpload(request, db, user);
    if (action === "mark_disbursement_done") return xpayMarkDone(request, db, user);
    if (action === "delete_disbursement_batch") return xpayDeleteDisbursementBatch(request, db);
    if (action === "upload_balance_chunk") return xpayUploadBalanceChunk(request, db, user);
    if (action === "delete_balance_batch") return xpayDeleteBalanceBatch(request, db);
  }

  throw new AppError(404, `Action Xpay tidak ditemukan: ${action}`, "xpay-cloud-action");
}

async function xpaySummary(db) {
  const row = await db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(record_value),0) AS total_value,
      COALESCE(SUM(record_fee),0) AS total_fee,
      COALESCE(SUM(net_amount),0) AS total_net
    FROM xpay_transactions
  `).first();

  return json({
    success: true,
    summary: {
      total: Number(row?.total || 0),
      total_value: Number(row?.total_value || 0),
      total_fee: Number(row?.total_fee || 0),
      total_net: Number(row?.total_net || 0)
    }
  });
}

async function xpayGetBatches(db) {
  const result = await db.prepare(`
    SELECT batch_id, filename, file_type, total_records, total_amount, uploaded_by, uploaded_at
    FROM xpay_upload_history
    ORDER BY uploaded_at DESC
    LIMIT 1000
  `).all();
  return json({ success: true, batches: result.results || [] });
}

async function xpayUploadTransactionsChunk(request, db, user) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  const filename = xpayText(body.filename, 260);
  const input = Array.isArray(body.rows) ? body.rows : [];
  if (!batchId || !filename || !input.length) throw new AppError(400, "Batch, filename, atau rows kosong.", "xpay-upload-transaction-input");
  if (input.length > 120) throw new AppError(400, "Maksimal 120 transaksi per chunk.", "xpay-upload-transaction-limit");

  const now = Date.now();
  const statements = [];
  const values = [];

  for (const item of input) {
    const paymentTime = xpayText(item.paymentTime, 120);
    const parts = xpayPaymentParts(paymentTime);
    const partnerId = xpayText(item.partnerId, 120);
    if (!parts || !xpayUuid(partnerId)) continue;

    const settlement = xpaySettlementInfo(paymentTime);
    const recordValue = xpayNumber(item.recordValue);
    const recordFee = xpayNumber(item.recordFee);
    const netAmount = recordValue - recordFee;
    const transactionId = xpayText(item.transactionId, 200);
    const rowNo = Number(item.rowNo || 0);
    const signature = await sha256(`FULL:${batchId}:${rowNo}:${transactionId}:${paymentTime}:${partnerId}`);

    values.push(netAmount);
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO xpay_transactions (
        signature, transaction_id, payment, payment_date, payment_sec, settlement_raw,
        record_value, record_fee, status, member, partner_id, source, uploaded_by,
        created_at, updated_at, batch_id, record_date, net_amount, merchant,
        payment_time, settlement_type, settlement_date, vendor_id, status_excel, ticket
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      signature,
      transactionId,
      paymentTime,
      parts.date,
      parts.sec,
      xpayText(item.settlementRaw, 200),
      recordValue,
      recordFee,
      xpayText(item.statusExcel || "SUCCESS", 100),
      xpayText(item.member, 220),
      partnerId,
      filename,
      user.id,
      now,
      now,
      batchId,
      xpayText(item.recordDate, 120),
      netAmount,
      xpayText(item.merchant, 220),
      paymentTime,
      settlement.type,
      settlement.settlementDate,
      xpayText(item.vendorId, 220),
      xpayText(item.statusExcel, 100),
      xpayText(item.ticket, 300)
    ));
  }

  if (!statements.length) return json({ success: true, saved: 0, totalNet: 0 });

  const results = await db.batch(statements);
  let saved = 0;
  let totalNet = 0;
  for (let i = 0; i < results.length; i += 1) {
    if (Number(results[i]?.meta?.changes || 0) > 0) {
      saved += 1;
      totalNet += values[i] || 0;
    }
  }

  await db.prepare(`
    INSERT INTO xpay_upload_history
      (batch_id, filename, file_type, total_records, total_amount, uploaded_by, uploaded_at)
    VALUES (?, ?, 'TRANSACTION', ?, ?, ?, ?)
    ON CONFLICT(batch_id) DO UPDATE SET
      total_records = xpay_upload_history.total_records + excluded.total_records,
      total_amount = xpay_upload_history.total_amount + excluded.total_amount
  `).bind(batchId, filename, saved, totalNet, user.username, now).run();

  return json({ success: true, saved, totalNet });
}

async function xpaySettlementStart(request, db, user) {
  const body = await readJson(request);
  const settlementDate = xpayIsoDate(body.settlementDate);
  const filename = xpayText(body.filename, 260);
  const batchId = xpayText(body.batchId, 120);
  if (!settlementDate || !filename || !batchId) throw new AppError(400, "Data settlement belum lengkap.", "xpay-settlement-start");

  await db.prepare(`
    DELETE FROM xpay_settlement_details
    WHERE settlement_date = ?
  `).bind(settlementDate).run();

  await db.prepare(`
    DELETE FROM xpay_settlement_files
    WHERE settlement_date = ?
  `).bind(settlementDate).run();

  const result = await db.prepare(`
    INSERT INTO xpay_settlement_files
      (filename, settlement_date, total_records, total_amount, uploaded_by, uploaded_at)
    VALUES (?, ?, 0, 0, ?, ?)
  `).bind(filename, settlementDate, user.username, Date.now()).run();

  return json({ success: true, fileId: Number(result.meta?.last_row_id || 0) });
}

async function xpaySettlementChunk(request, db) {
  const body = await readJson(request);
  const fileId = Number(body.fileId || 0);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!fileId || !rows.length) throw new AppError(400, "fileId/rows settlement kosong.", "xpay-settlement-chunk");

  const file = await db.prepare("SELECT settlement_date FROM xpay_settlement_files WHERE id = ?").bind(fileId).first();
  if (!file) throw new AppError(404, "Settlement file tidak ditemukan.", "xpay-settlement-file");

  const statements = [];
  const amounts = [];
  for (const item of rows) {
    const partner = xpayText(item.partnerId, 120);
    const amount = xpayNumber(item.amount);
    if (!xpayUuid(partner) || amount <= 0) continue;
    amounts.push(amount);
    statements.push(db.prepare(`
      INSERT INTO xpay_settlement_details
        (settlement_file_id, partner_id, amount, settlement_date)
      VALUES (?, ?, ?, ?)
    `).bind(fileId, partner, amount, file.settlement_date));
  }

  if (!statements.length) return json({ success: true, saved: 0, totalAmount: 0 });
  const results = await db.batch(statements);
  let saved = 0, totalAmount = 0;
  for (let i = 0; i < results.length; i += 1) {
    if (Number(results[i]?.meta?.changes || 0) > 0) {
      saved += 1;
      totalAmount += amounts[i] || 0;
    }
  }
  return json({ success: true, saved, totalAmount });
}

async function xpaySettlementFinish(request, db, user) {
  const body = await readJson(request);
  const fileId = Number(body.fileId || 0);
  const batchId = xpayText(body.batchId, 120);
  const filename = xpayText(body.filename, 260);
  const settlementDate = xpayIsoDate(body.settlementDate);
  const totalRecords = Math.max(0, Math.trunc(Number(body.totalRecords || 0)));
  const totalAmount = xpayNumber(body.totalAmount);
  if (!fileId || !batchId || !filename || !settlementDate) throw new AppError(400, "Finalize settlement belum lengkap.", "xpay-settlement-finish");

  await db.prepare(`
    UPDATE xpay_settlement_files
    SET total_records = ?, total_amount = ?
    WHERE id = ?
  `).bind(totalRecords, totalAmount, fileId).run();

  await db.prepare(`
    INSERT INTO xpay_upload_history
      (batch_id, filename, file_type, total_records, total_amount, uploaded_by, uploaded_at)
    VALUES (?, ?, 'SETTLEMENT', ?, ?, ?, ?)
    ON CONFLICT(batch_id) DO UPDATE SET
      total_records = excluded.total_records,
      total_amount = excluded.total_amount
  `).bind(batchId, filename, totalRecords, totalAmount, user.username, Date.now()).run();

  const comparison = await xpayRunComparison(db, settlementDate);
  return json({ success: true, comparison });
}

async function xpayCheckSettlement(db, dateRaw) {
  const date = xpayIsoDate(dateRaw);
  if (!date) throw new AppError(400, "Tanggal tidak valid.", "xpay-check-date");

  const settlementResult = await db.prepare(`
    SELECT * FROM xpay_transactions
    WHERE settlement_date = ? AND settlement_type = 'SETTLEMENT'
    ORDER BY payment_time
  `).bind(date).all();

  const cutoffResult = await db.prepare(`
    SELECT * FROM xpay_transactions
    WHERE settlement_date = ? AND settlement_type = 'CUTOFF'
    ORDER BY payment_time
  `).bind(date).all();

  const yesterday = xpayAddDays(date, -1);
  const cutoffTodayResult = await db.prepare(`
    SELECT * FROM xpay_transactions
    WHERE payment_date = ? AND settlement_type = 'CUTOFF'
    ORDER BY payment_time
  `).bind(yesterday).all();

  const settlement = settlementResult.results || [];
  const cutoff = cutoffResult.results || [];
  const cutoffToday = cutoffTodayResult.results || [];

  const s = xpaySumTransactions(settlement);
  const c = xpaySumTransactions(cutoff);
  const ct = xpaySumTransactions(cutoffToday);
  const all = [...settlement, ...cutoff].map(xpayFormatTransaction);

  return json({
    success: true,
    target_date: date,
    settlement_source_date: xpayDisplayDate(xpayAddDays(date, -1)),
    cutoff_source_date: xpayDisplayDate(xpayAddDays(date, -2)),
    settlement_count: settlement.length,
    settlement_amount: s.net, settlement_amount_formatted: xpayRupiah(s.net),
    settlement_fee: s.fee, settlement_fee_formatted: xpayRupiah(s.fee),
    settlement_value: s.value, settlement_value_formatted: xpayRupiah(s.value),
    cutoff_count: cutoff.length,
    cutoff_amount: c.net, cutoff_amount_formatted: xpayRupiah(c.net),
    cutoff_fee: c.fee, cutoff_fee_formatted: xpayRupiah(c.fee),
    cutoff_value: c.value, cutoff_value_formatted: xpayRupiah(c.value),
    cutoff_today_count: cutoffToday.length,
    cutoff_today_amount: ct.net, cutoff_today_amount_formatted: xpayRupiah(ct.net),
    cutoff_today_fee: ct.fee, cutoff_today_fee_formatted: xpayRupiah(ct.fee),
    cutoff_today_value: ct.value, cutoff_today_value_formatted: xpayRupiah(ct.value),
    cutoff_today_date: yesterday,
    cutoff_today_cair_date: xpayDisplayDate(xpayAddDays(date, 1)),
    total_count: all.length,
    total_amount: s.net + c.net, total_amount_formatted: xpayRupiah(s.net + c.net),
    total_fee: s.fee + c.fee, total_fee_formatted: xpayRupiah(s.fee + c.fee),
    total_value: s.value + c.value, total_value_formatted: xpayRupiah(s.value + c.value),
    transactions: all
  });
}

async function xpayGetComparison(db, dateRaw) {
  const date = xpayIsoDate(dateRaw);
  if (!date) throw new AppError(400, "Tanggal comparison tidak valid.", "xpay-comparison-date");

  const count = await db.prepare(`
    SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
    FROM xpay_settlement_details WHERE settlement_date = ?
  `).bind(date).first();

  if (Number(count?.cnt || 0) > 0) await xpayRunComparison(db, date);

  const result = await db.prepare(`
    SELECT settlement_date, partner_id, expected_amount, actual_amount,
           difference, status, transaction_count
    FROM xpay_comparison_results
    WHERE settlement_date = ?
    ORDER BY status, partner_id
  `).bind(date).all();

  const data = result.results || [];
  const summary = {
    match: 0, mismatch: 0, missing_bank: 0, missing_system: 0,
    total_expected: 0, total_actual: 0, total_diff: 0
  };
  for (const row of data) {
    if (row.status === "MATCH") summary.match += 1;
    else if (row.status === "MISMATCH") summary.mismatch += 1;
    else if (row.status === "MISSING_IN_BANK") summary.missing_bank += 1;
    else if (row.status === "MISSING_IN_SYSTEM") summary.missing_system += 1;
    summary.total_expected += Number(row.expected_amount || 0);
    summary.total_actual += Number(row.actual_amount || 0);
    summary.total_diff += Number(row.difference || 0);
  }

  return json({
    success: true,
    data,
    settlement_count: Number(count?.cnt || 0),
    settlement_total_formatted: xpayRupiah(count?.total || 0),
    summary
  });
}

async function xpayRunComparison(db, settlementDate) {
  await db.prepare("DELETE FROM xpay_comparison_results WHERE settlement_date = ?").bind(settlementDate).run();

  const expectedRows = (await db.prepare(`
    SELECT partner_id, SUM(record_value) AS total, COUNT(*) AS count
    FROM xpay_transactions
    WHERE settlement_date = ?
    GROUP BY partner_id
  `).bind(settlementDate).all()).results || [];

  const actualRows = (await db.prepare(`
    SELECT partner_id, SUM(amount) AS total, COUNT(*) AS count
    FROM xpay_settlement_details
    WHERE settlement_date = ?
    GROUP BY partner_id
  `).bind(settlementDate).all()).results || [];

  const expected = new Map(expectedRows.map(row => [row.partner_id, row]));
  const actual = new Map(actualRows.map(row => [row.partner_id, row]));
  const partners = [...new Set([...expected.keys(), ...actual.keys()])];

  let match = 0, mismatch = 0;
  const statements = [];
  for (const partner of partners) {
    const e = expected.get(partner);
    const a = actual.get(partner);
    const expectedAmount = Number(e?.total || 0);
    const actualAmount = Number(a?.total || 0);
    const difference = expectedAmount - actualAmount;
    let status = "";
    if (!e) { status = "MISSING_IN_SYSTEM"; mismatch += 1; }
    else if (!a) { status = "MISSING_IN_BANK"; mismatch += 1; }
    else if (Math.abs(difference) < 0.01) { status = "MATCH"; match += 1; }
    else { status = "MISMATCH"; mismatch += 1; }

    statements.push(db.prepare(`
      INSERT INTO xpay_comparison_results
        (settlement_date, partner_id, expected_amount, actual_amount, difference, status, transaction_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(settlementDate, partner, expectedAmount, actualAmount, difference, status, Number(e?.count || 0)));
  }
  if (statements.length) await db.batch(statements);
  return { match, mismatch };
}

async function xpayGetTransactions(db) {
  const result = await db.prepare(`
    SELECT batch_id, transaction_id, record_date, record_value, record_fee, net_amount,
           merchant, member, payment_time, settlement_type, settlement_date, payment_date,
           partner_id, vendor_id, status_excel, ticket
    FROM xpay_transactions
    ORDER BY payment_time DESC, id DESC
    LIMIT 10000
  `).all();
  return json({ success: true, data: result.results || [] });
}

async function xpayDeleteBatch(request, db) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  const fileType = xpayText(body.fileType, 40).toUpperCase();
  if (!batchId) throw new AppError(400, "Batch ID tidak valid.", "xpay-delete-batch");

  let deleted = 0;
  if (fileType === "DISBURSEMENT") {
    return xpayDeleteDisbursementBatchBody(db, batchId);
  }

  if (fileType === "TRANSACTION") {
    const result = await db.prepare("DELETE FROM xpay_transactions WHERE batch_id = ?").bind(batchId).run();
    deleted = Number(result.meta?.changes || 0);
  }

  await db.prepare("DELETE FROM xpay_upload_history WHERE batch_id = ?").bind(batchId).run();
  return json({ success: true, deleted });
}

async function xpayGetDisbursements(db, url) {
  const date = xpayIsoDate(url.searchParams.get("date") || "", true);
  const status = String(url.searchParams.get("status") || "");
  const done = String(url.searchParams.get("done") || "");

  const where = [];
  const binds = [];
  if (date) { where.push("date_disbursement = ?"); binds.push(date); }
  if (status && status !== "all") {
    if (status === "pending") where.push("vendor_status = 'pending'");
    else if (status === "failed") where.push("vendor_status = 'failed - refund'");
    else if (status === "success") where.push("vendor_status = 'success'");
  }
  if (done !== "") { where.push("status_done = ?"); binds.push(done === "1" ? 1 : 0); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const stmt = db.prepare(`
    SELECT * FROM xpay_disbursements
    ${clause}
    ORDER BY date_disbursement DESC, id DESC
    LIMIT 10000
  `);
  const result = binds.length ? await stmt.bind(...binds).all() : await stmt.all();

  const summaryStmt = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN vendor_status='pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN vendor_status='failed - refund' THEN 1 ELSE 0 END) AS failed_count,
      SUM(CASE WHEN vendor_status='success' THEN 1 ELSE 0 END) AS success_count,
      SUM(CASE WHEN status_done=1 THEN 1 ELSE 0 END) AS done_count
    FROM xpay_disbursements ${clause}
  `);
  const summary = binds.length ? await summaryStmt.bind(...binds).first() : await summaryStmt.first();

  return json({
    success: true,
    data: (result.results || []).map(row => ({
      ...row,
      amount_formatted: xpayRupiah(row.amount),
      date_formatted: xpayDisplayDate(row.date_disbursement)
    })),
    summary: summary || {}
  });
}

async function xpayUploadDisbursementChunk(request, db, user) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!batchId || !rows.length) throw new AppError(400, "Batch/rows disbursement kosong.", "xpay-disbursement-upload");
  if (rows.length > 100) throw new AppError(400, "Maksimal 100 disbursement per chunk.", "xpay-disbursement-limit");

  const refs = rows.map(row => xpayText(row.refId, 220)).filter(Boolean);
  const placeholders = refs.map(() => "?").join(",");
  let existing = [];
  if (refs.length) {
    existing = (await db.prepare(`
      SELECT id, ref_id, vendor_status, status_done
      FROM xpay_disbursements
      WHERE ref_id IN (${placeholders})
    `).bind(...refs).all()).results || [];
  }
  const existingMap = new Map(existing.map(row => [row.ref_id, row]));
  const now = Date.now();
  const statements = [];
  const validRows = [];

  let inserted = 0, updated = 0, statusChanged = 0, preservedDone = 0;

  for (const item of rows) {
    const refId = xpayText(item.refId, 220);
    const dateDisbursement = xpayIsoDate(item.dateDisbursement);
    if (!refId || !dateDisbursement) continue;

    let vendorStatus = xpayText(item.vendorStatus, 100).toLowerCase();
    if (!vendorStatus || vendorStatus === "blank") vendorStatus = "pending";
    else if (vendorStatus.includes("failed") || vendorStatus.includes("refund")) vendorStatus = "failed - refund";
    else if (vendorStatus === "success") vendorStatus = "success";

    const old = existingMap.get(refId);
    if (old) {
      updated += 1;
      if (Number(old.status_done) === 1) preservedDone += 1;
      if (String(old.vendor_status) !== vendorStatus) statusChanged += 1;
    } else inserted += 1;

    validRows.push({ refId, vendorStatus, old });

    statements.push(db.prepare(`
      INSERT INTO xpay_disbursements (
        batch_id, transaction_id, date_disbursement, bank_code, bank_no,
        account_name, amount, ref_id, vendor_status, status_done,
        updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      ON CONFLICT(ref_id) DO UPDATE SET
        batch_id = excluded.batch_id,
        transaction_id = excluded.transaction_id,
        date_disbursement = excluded.date_disbursement,
        bank_code = excluded.bank_code,
        bank_no = excluded.bank_no,
        account_name = excluded.account_name,
        amount = excluded.amount,
        vendor_status = excluded.vendor_status,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `).bind(
      batchId,
      xpayText(item.transactionId, 220),
      dateDisbursement,
      xpayText(item.bankCode, 100),
      xpayText(item.bankNo, 160),
      xpayText(item.accountName, 260),
      xpayNumber(item.amount),
      refId,
      vendorStatus,
      user.username,
      now,
      now
    ));
  }

  if (statements.length) await db.batch(statements);

  if (validRows.length) {
    const refs2 = validRows.map(row => row.refId);
    const ph2 = refs2.map(() => "?").join(",");
    const idRows = (await db.prepare(`
      SELECT id, ref_id FROM xpay_disbursements WHERE ref_id IN (${ph2})
    `).bind(...refs2).all()).results || [];
    const idMap = new Map(idRows.map(row => [row.ref_id, row.id]));
    const logs = [];
    for (const row of validRows) {
      const id = idMap.get(row.refId);
      if (!id) continue;
      if (!row.old) {
        logs.push(db.prepare(`
          INSERT INTO xpay_disbursement_logs
            (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
          VALUES (?, ?, ?, 'INSERT', NULL, NULL, ?, ?, ?)
        `).bind(id, row.refId, batchId, row.vendorStatus, user.username, now));
      } else if (String(row.old.vendor_status) !== row.vendorStatus) {
        logs.push(db.prepare(`
          INSERT INTO xpay_disbursement_logs
            (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
          VALUES (?, ?, ?, 'UPDATE', 'vendor_status', ?, ?, ?, ?)
        `).bind(id, row.refId, batchId, String(row.old.vendor_status || ""), row.vendorStatus, user.username, now));
      }
    }
    if (logs.length) await db.batch(logs);
  }

  return json({ success: true, inserted, updated, statusChanged, preservedDone });
}

async function xpayFinishDisbursementUpload(request, db, user) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  const filename = xpayText(body.filename, 260);
  const totalRecords = Math.max(0, Math.trunc(Number(body.totalRecords || 0)));
  if (!batchId || !filename) throw new AppError(400, "Finalize disbursement belum lengkap.", "xpay-disbursement-finish");

  await db.prepare(`
    INSERT INTO xpay_upload_history
      (batch_id, filename, file_type, total_records, total_amount, uploaded_by, uploaded_at)
    VALUES (?, ?, 'DISBURSEMENT', ?, 0, ?, ?)
    ON CONFLICT(batch_id) DO UPDATE SET
      total_records = excluded.total_records
  `).bind(batchId, filename, totalRecords, user.username, Date.now()).run();

  return json({ success: true });
}

async function xpayGetDisbursementBatches(db) {
  const result = await db.prepare(`
    SELECT batch_id, filename, total_records, uploaded_by, uploaded_at
    FROM xpay_upload_history
    WHERE file_type = 'DISBURSEMENT'
    ORDER BY uploaded_at DESC
    LIMIT 1000
  `).all();
  return json({ success: true, batches: result.results || [] });
}

async function xpayGetDisbursementLogs(db, refIdRaw) {
  const refId = xpayText(refIdRaw, 220);
  if (!refId) throw new AppError(400, "REF_ID tidak valid.", "xpay-log-ref");
  const result = await db.prepare(`
    SELECT action_type, field_name, old_value, new_value, changed_by, changed_at
    FROM xpay_disbursement_logs
    WHERE ref_id = ?
    ORDER BY changed_at DESC
    LIMIT 500
  `).bind(refId).all();

  return json({
    success: true,
    logs: (result.results || []).map(row => ({
      ...row,
      changed_at_formatted: xpayDateTime(row.changed_at)
    }))
  });
}

async function xpayMarkDone(request, db, user) {
  const body = await readJson(request);
  const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
  const actionType = String(body.actionType || "mark");
  if (!ids.length) throw new AppError(400, "Pilih minimal satu data.", "xpay-mark-empty");
  if (!["mark", "unmark"].includes(actionType)) throw new AppError(400, "Action mark tidak valid.", "xpay-mark-action");

  const ph = ids.map(() => "?").join(",");
  const rows = (await db.prepare(`
    SELECT id, ref_id, status_done FROM xpay_disbursements WHERE id IN (${ph})
  `).bind(...ids).all()).results || [];

  const now = Date.now();
  const statements = [];
  let changed = 0;

  for (const row of rows) {
    if (actionType === "mark" && Number(row.status_done) === 0) {
      changed += 1;
      statements.push(db.prepare("UPDATE xpay_disbursements SET status_done=1, updated_by=?, updated_at=? WHERE id=?").bind(user.username, now, row.id));
      statements.push(db.prepare(`
        INSERT INTO xpay_disbursement_marks (disbursement_id, ref_id, marked_by, note, marked_at)
        VALUES (?, ?, ?, NULL, ?)
      `).bind(row.id, row.ref_id, user.username, now));
      statements.push(db.prepare(`
        INSERT INTO xpay_disbursement_logs
          (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, '', 'MARK_DONE', 'status_done', '0', '1', ?, ?)
      `).bind(row.id, row.ref_id, user.username, now));
    } else if (actionType === "unmark" && Number(row.status_done) === 1) {
      changed += 1;
      statements.push(db.prepare("UPDATE xpay_disbursements SET status_done=0, updated_by=?, updated_at=? WHERE id=?").bind(user.username, now, row.id));
      statements.push(db.prepare(`
        INSERT INTO xpay_disbursement_logs
          (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, '', 'UNMARK_DONE', 'status_done', '1', '0', ?, ?)
      `).bind(row.id, row.ref_id, user.username, now));
    }
  }
  if (statements.length) await db.batch(statements);
  return json({ success: true, changed });
}

async function xpayDeleteDisbursementBatch(request, db) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  if (!batchId) throw new AppError(400, "Batch ID tidak valid.", "xpay-delete-disb");
  return xpayDeleteDisbursementBatchBody(db, batchId);
}

async function xpayDeleteDisbursementBatchBody(db, batchId) {
  const count = await db.prepare("SELECT COUNT(*) AS total FROM xpay_disbursements WHERE batch_id=?").bind(batchId).first();
  await db.prepare(`
    DELETE FROM xpay_disbursement_marks
    WHERE disbursement_id IN (SELECT id FROM xpay_disbursements WHERE batch_id = ?)
  `).bind(batchId).run();
  await db.prepare(`
    DELETE FROM xpay_disbursement_logs
    WHERE disbursement_id IN (SELECT id FROM xpay_disbursements WHERE batch_id = ?)
  `).bind(batchId).run();
  await db.prepare("DELETE FROM xpay_disbursements WHERE batch_id=?").bind(batchId).run();
  await db.prepare("DELETE FROM xpay_upload_history WHERE batch_id=? AND file_type='DISBURSEMENT'").bind(batchId).run();
  return json({ success: true, deleted: Number(count?.total || 0) });
}

async function xpayUploadBalanceChunk(request, db, user) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!batchId || !rows.length) throw new AppError(400, "Batch/rows balance kosong.", "xpay-balance-upload");
  if (rows.length > 140) throw new AppError(400, "Maksimal 140 balance per chunk.", "xpay-balance-limit");

  const statements = [];
  for (const item of rows) {
    const recordId = xpayText(item.recordId, 220);
    const dateCreated = xpayText(item.dateCreated, 80);
    if (!recordId || !dateCreated) continue;
    const signature = await sha256(`BAL:${batchId}:${Number(item.rowNo || 0)}:${recordId}:${dateCreated}`);
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO xpay_balance_history
        (signature, batch_id, record_id, date_created, note, credit, debit, balance, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      signature, batchId, recordId, dateCreated, xpayText(item.note, 1000),
      xpayNumber(item.credit), xpayNumber(item.debit), xpayNumber(item.balance),
      user.username, Date.now()
    ));
  }
  if (!statements.length) return json({ success: true, saved: 0 });
  const results = await db.batch(statements);
  return json({ success: true, saved: results.reduce((n,r)=>n+Number(r?.meta?.changes||0),0) });
}

async function xpayGetBalanceHistory(db, dateRaw) {
  const date = xpayIsoDate(dateRaw, true);
  let result;
  if (date) {
    result = await db.prepare(`
      SELECT * FROM xpay_balance_history
      WHERE substr(date_created,1,10)=?
      ORDER BY date_created DESC, id DESC
      LIMIT 10000
    `).bind(date).all();
  } else {
    result = await db.prepare(`
      SELECT * FROM xpay_balance_history
      ORDER BY date_created DESC, id DESC
      LIMIT 10000
    `).all();
  }

  const data = [];
  let sumCredit = 0, sumDebit = 0, countCredit = 0, countDebit = 0, totalCreditAll = 0, totalDebitAll = 0;
  for (const row of result.results || []) {
    const credit = Number(row.credit || 0);
    const debit = Number(row.debit || 0);
    totalCreditAll += Math.abs(credit);
    totalDebitAll += debit;
    const isFee = Math.abs(Math.abs(credit)-1500)<0.01 && credit<0;
    const isRefund = Math.abs(debit-1500)<0.01 && debit>0;
    if (isFee) { sumCredit += credit; countCredit += 1; }
    if (isRefund) { sumDebit += debit; countDebit += 1; }
    data.push({
      ...row,
      credit_formatted: xpayRupiah(Math.abs(credit)),
      debit_formatted: xpayRupiah(debit),
      balance_formatted: xpayRupiah(row.balance),
      date_formatted: xpayDisplayDateTimeText(row.date_created),
      is_fee: isFee,
      is_refund: isRefund
    });
  }
  const totalBiaya = (sumCredit + sumDebit) * -1;

  return json({
    success: true,
    data,
    summary: {
      total_records: data.length,
      sum_credit: sumCredit,
      sum_credit_formatted: xpayRupiah(Math.abs(sumCredit)),
      count_credit: countCredit,
      sum_debit: sumDebit,
      sum_debit_formatted: xpayRupiah(sumDebit),
      count_debit: countDebit,
      total_biaya: totalBiaya,
      total_biaya_formatted: xpayRupiah(totalBiaya),
      total_credit_all: totalCreditAll,
      total_credit_all_formatted: xpayRupiah(totalCreditAll),
      total_debit_all: totalDebitAll,
      total_debit_all_formatted: xpayRupiah(totalDebitAll)
    }
  });
}

async function xpayGetBalanceBatches(db) {
  const result = await db.prepare(`
    SELECT batch_id, MIN(uploaded_at) AS uploaded_at, COUNT(*) AS total_records, MIN(uploaded_by) AS uploaded_by
    FROM xpay_balance_history
    GROUP BY batch_id
    ORDER BY uploaded_at DESC
    LIMIT 1000
  `).all();

  return json({
    success: true,
    batches: (result.results || []).map(row => ({
      ...row,
      uploaded_at_formatted: xpayDateTime(row.uploaded_at)
    }))
  });
}

async function xpayDeleteBalanceBatch(request, db) {
  const body = await readJson(request);
  const batchId = xpayText(body.batchId, 120);
  if (!batchId) throw new AppError(400, "Batch ID tidak valid.", "xpay-balance-delete");
  const result = await db.prepare("DELETE FROM xpay_balance_history WHERE batch_id=?").bind(batchId).run();
  return json({ success: true, deleted: Number(result.meta?.changes || 0) });
}

function xpayPaymentParts(value) {
  const match = String(value || "").trim().match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    date: match[1],
    sec: Number(match[2])*3600 + Number(match[3])*60 + Number(match[4])
  };
}

function xpaySettlementInfo(payment) {
  const parts = xpayPaymentParts(payment);
  if (!parts) return null;
  if (parts.sec >= 84600) {
    return { type: "CUTOFF", paymentDate: parts.date, settlementDate: xpayAddDays(parts.date, 2) };
  }
  return { type: "SETTLEMENT", paymentDate: parts.date, settlementDate: xpayAddDays(parts.date, 1) };
}

function xpayAddDays(date, delta) {
  const [y,m,d] = String(date).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(delta || 0));
  return dt.toISOString().slice(0,10);
}

function xpayIsoDate(value, allowEmpty=false) {
  const text = String(value || "").trim();
  if (!text && allowEmpty) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function xpayUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function xpayText(value, max=500) {
  return String(value ?? "").trim().slice(0, max);
}

function xpayNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function xpayRupiah(value) {
  return "Rp " + Math.round(Number(value || 0)).toLocaleString("id-ID");
}

function xpaySumTransactions(rows) {
  return rows.reduce((sum,row)=>{
    sum.value += Number(row.record_value || 0);
    sum.fee += Number(row.record_fee || 0);
    sum.net += Number(row.net_amount || 0);
    return sum;
  }, {value:0,fee:0,net:0});
}

function xpayFormatTransaction(row) {
  const parts = xpayPaymentParts(row.payment_time);
  return {
    ...row,
    record_value_formatted: xpayRupiah(row.record_value),
    record_fee_formatted: xpayRupiah(row.record_fee),
    net_amount_formatted: xpayRupiah(row.net_amount),
    payment_date: parts ? xpayDisplayDate(parts.date) : row.payment_date,
    payment_time: parts ? xpayClock(parts.sec) : row.payment_time
  };
}

function xpayClock(sec) {
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  return [h,m,s].map(n=>String(n).padStart(2,"0")).join(":");
}

function xpayDisplayDate(date) {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(date || "");
}

function xpayDisplayDateTimeText(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : String(value || "");
}

function xpayDateTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return String(value || "");
  return new Date(n).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour12: false });
}

async function getCheckerBankConfig(db) {
  const url = await readAppSetting(
    db,
    "checker_bank_sheet_url"
  );

  return json({
    configured: Boolean(url),
    url
  });
}

async function updateCheckerBankConfig(request, db, user) {
  const body = await readJson(request);
  const url = validateCheckerSheetUrl(
    String(body.url || "").trim()
  );

  await upsertAppSetting(
    db,
    "checker_bank_sheet_url",
    url,
    user.id
  );

  return json({
    success: true,
    configured: true,
    url
  });
}

async function readCheckerBankData(db) {
  const sourceUrl = await readAppSetting(
    db,
    "checker_bank_sheet_url"
  );

  if (!sourceUrl) {
    throw new AppError(
      409,
      "Database BANK belum dikonfigurasi oleh Master Administrator.",
      "checker-bank-not-configured"
    );
  }

  const parsed = parseCheckerSheetUrl(sourceUrl);
  const targetParam = parsed.gid
    ? `gid=${encodeURIComponent(parsed.gid)}`
    : `sheet=${encodeURIComponent("BANK")}`;

  const gvizUrl =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(parsed.id)}` +
    `/gviz/tq?tqx=out:csv&${targetParam}&_=${Date.now()}`;

  let response;

  try {
    response = await fetch(gvizUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept": "text/csv,text/plain,*/*",
        "User-Agent": "TheLastMoon-Checker/1.0"
      }
    });
  } catch (error) {
    throw new AppError(
      502,
      `Tidak dapat terhubung ke Google Sheets: ${safeErrorMessage(error)}`,
      "checker-bank-fetch"
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      `Google Sheets mengembalikan HTTP ${response.status}. Pastikan spreadsheet dapat dibaca oleh server.`,
      "checker-bank-google-http"
    );
  }

  const csv = await response.text();
  const table = parseCsv(csv);

  const rows = table
    .map((cells, index) => {
      const name = String(cells[0] || "").trim();
      const account = normalizeCheckerAccount(
        cells[1] || ""
      );
      const status = String(cells[2] || "").trim();

      return {
        row: index + 1,
        name,
        account,
        status
      };
    })
    .filter(row => row.name || row.account || row.status)
    .filter(row => {
      const name = normalizeCheckerName(row.name);
      const account = normalizeCheckerName(row.account);
      const status = normalizeCheckerName(row.status);

      return !(
        name.includes("NAMA") &&
        (
          account.includes("NOMOR") ||
          status.includes("STATUS")
        )
      );
    });

  if (!rows.length) {
    throw new AppError(
      422,
      "Spreadsheet terbaca, tetapi data BANK A:B:C kosong atau formatnya tidak sesuai.",
      "checker-bank-empty"
    );
  }

  return json({
    ok: true,
    total: rows.length,
    rows
  });
}

function validateCheckerSheetUrl(value) {
  if (!value) {
    throw new AppError(
      400,
      "Link Google Spreadsheet wajib diisi.",
      "checker-bank-url-empty"
    );
  }

  if (value.length > 2000) {
    throw new AppError(
      400,
      "Link Google Spreadsheet terlalu panjang.",
      "checker-bank-url-length"
    );
  }

  parseCheckerSheetUrl(value);
  return value;
}

function parseCheckerSheetUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch (_) {
    throw new AppError(
      400,
      "Format Link Google Spreadsheet tidak valid.",
      "checker-bank-url-invalid"
    );
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "docs.google.com"
  ) {
    throw new AppError(
      400,
      "Link harus berasal dari https://docs.google.com.",
      "checker-bank-url-host"
    );
  }

  const match = parsed.pathname.match(
    /^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/
  );

  if (!match) {
    throw new AppError(
      400,
      "Link Google Spreadsheet tidak mempunyai Spreadsheet ID yang valid.",
      "checker-bank-url-id"
    );
  }

  const hashParams = new URLSearchParams(
    String(parsed.hash || "").replace(/^#/, "")
  );

  const gid =
    parsed.searchParams.get("gid") ||
    hashParams.get("gid") ||
    "";

  return {
    id: match[1],
    gid: /^\d+$/.test(gid) ? gid : ""
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function normalizeCheckerAccount(value) {
  return String(value || "")
    .trim()
    .replace(/^'+/, "")
    .replace(/[^0-9]/g, "");
}

function normalizeCheckerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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
