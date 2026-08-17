const VERSION = "v30-xpay-dedicated-function";
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

    const user = await getXpaySessionUser(request, env.DB);

    if (!user) {
      throw new AppError(
        401,
        "Sesi login habis. Silakan login ulang.",
        "session"
      );
    }

    requireXpayAccess(user);

    // V30: hanya satu pengecekan ringan per isolate.
    // Tidak menjalankan initializeDatabase(), ensureMaster(),
    // migration background, atau bootstrap dashboard utama.
    await ensureXpayRouteReady(env.DB);

    return await handleXpayCloud(request, env.DB, user, url);
  } catch (error) {
    console.error("Xpay dedicated API error:", error);

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
      error: "Terjadi kesalahan pada Xpay API.",
      detail: safeErrorMessage(error),
      version: VERSION
    }, 500);
  }
}

let xpayRouteReady = false;

async function ensureXpayRouteReady(db) {
  if (xpayRouteReady) return;

  // Cek tabel utama dengan sqlite_master; ini tidak scan isi transaksi.
  const existing = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'xpay28_transactions'
    LIMIT 1
  `).first();

  if (!existing) {
    await createXpay28Tables(db);
  }

  xpayRouteReady = true;
}

async function createXpay28Tables(db) {
  const sql = [
    `CREATE TABLE IF NOT EXISTS xpay28_transactions (
      id INTEGER PRIMARY KEY,
      signature TEXT NOT NULL UNIQUE,
      batch_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL DEFAULT '',
      record_date TEXT NOT NULL DEFAULT '',
      record_value REAL NOT NULL DEFAULT 0,
      record_fee REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      merchant TEXT NOT NULL DEFAULT '',
      member TEXT NOT NULL DEFAULT '',
      payment_time TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      payment_sec INTEGER NOT NULL DEFAULT 0,
      settlement_raw TEXT NOT NULL DEFAULT '',
      settlement_type TEXT NOT NULL,
      settlement_date TEXT NOT NULL,
      partner_id TEXT NOT NULL DEFAULT '',
      vendor_id TEXT NOT NULL DEFAULT '',
      status_excel TEXT NOT NULL DEFAULT '',
      ticket TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      uploaded_by INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_transactions_settlement
      ON xpay28_transactions(settlement_date, settlement_type)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_transactions_payment
      ON xpay28_transactions(payment_date, payment_sec)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_transactions_partner
      ON xpay28_transactions(partner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_transactions_batch
      ON xpay28_transactions(batch_id)`,

    `CREATE TABLE IF NOT EXISTS xpay28_upload_history (
      batch_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL DEFAULT '',
      file_type TEXT NOT NULL DEFAULT '',
      total_records INTEGER NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT '',
      uploaded_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS xpay28_settlement_files (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL DEFAULT '',
      settlement_date TEXT NOT NULL,
      total_records INTEGER NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      uploaded_by TEXT NOT NULL DEFAULT '',
      uploaded_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_settlement_files_date
      ON xpay28_settlement_files(settlement_date)`,

    `CREATE TABLE IF NOT EXISTS xpay28_settlement_details (
      id INTEGER PRIMARY KEY,
      settlement_file_id INTEGER NOT NULL,
      partner_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      settlement_date TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_settlement_details_date
      ON xpay28_settlement_details(settlement_date)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_settlement_details_partner
      ON xpay28_settlement_details(partner_id)`,

    `CREATE TABLE IF NOT EXISTS xpay28_comparison_results (
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

    `CREATE TABLE IF NOT EXISTS xpay28_disbursements (
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
    `CREATE INDEX IF NOT EXISTS idx_xpay28_disbursements_date
      ON xpay28_disbursements(date_disbursement)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_disbursements_status
      ON xpay28_disbursements(vendor_status, status_done)`,

    `CREATE TABLE IF NOT EXISTS xpay28_disbursement_logs (
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
    `CREATE INDEX IF NOT EXISTS idx_xpay28_disbursement_logs_ref
      ON xpay28_disbursement_logs(ref_id, changed_at)`,

    `CREATE TABLE IF NOT EXISTS xpay28_disbursement_marks (
      id INTEGER PRIMARY KEY,
      disbursement_id INTEGER NOT NULL,
      ref_id TEXT NOT NULL,
      marked_by TEXT NOT NULL DEFAULT '',
      note TEXT,
      marked_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS xpay28_balance_history (
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
    `CREATE INDEX IF NOT EXISTS idx_xpay28_balance_date
      ON xpay28_balance_history(date_created)`,
    `CREATE INDEX IF NOT EXISTS idx_xpay28_balance_batch
      ON xpay28_balance_history(batch_id)`
  ];

  // D1 Free allows 50 read subrequests/invocation. This bootstrap stays below that.
  await db.batch(sql.map(statement => db.prepare(statement)));
}

async function getXpaySessionUser(request, db) {
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

function requireXpayAccess(user) {
  if (Number(user.is_master) === 1) return;

  let permissions = [];
  try {
    permissions = JSON.parse(user.permissions || "[]");
  } catch (_) {
    permissions = [];
  }

  if (!Array.isArray(permissions) || !permissions.includes("xpay-checker")) {
    throw new AppError(
      403,
      "Akun ini tidak memiliki akses Xpay Checker.",
      "permission"
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
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return "";
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_JSON_BYTES) {
    throw new AppError(
      413,
      "Data request terlalu besar.",
      "json-size"
    );
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new AppError(
      413,
      "Data request terlalu besar.",
      "json-size"
    );
  }

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_) {
    throw new AppError(
      400,
      "Format JSON tidak valid.",
      "json"
    );
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function safeErrorMessage(error) {
  if (!error) return "Unknown error";
  return String(error.message || error).slice(0, 600);
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
    FROM xpay28_transactions
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
    FROM xpay28_upload_history
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
      INSERT OR IGNORE INTO xpay28_transactions (
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
    INSERT INTO xpay28_upload_history
      (batch_id, filename, file_type, total_records, total_amount, uploaded_by, uploaded_at)
    VALUES (?, ?, 'TRANSACTION', ?, ?, ?, ?)
    ON CONFLICT(batch_id) DO UPDATE SET
      total_records = xpay28_upload_history.total_records + excluded.total_records,
      total_amount = xpay28_upload_history.total_amount + excluded.total_amount
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
    DELETE FROM xpay28_settlement_details
    WHERE settlement_date = ?
  `).bind(settlementDate).run();

  await db.prepare(`
    DELETE FROM xpay28_settlement_files
    WHERE settlement_date = ?
  `).bind(settlementDate).run();

  const result = await db.prepare(`
    INSERT INTO xpay28_settlement_files
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

  const file = await db.prepare("SELECT settlement_date FROM xpay28_settlement_files WHERE id = ?").bind(fileId).first();
  if (!file) throw new AppError(404, "Settlement file tidak ditemukan.", "xpay-settlement-file");

  const statements = [];
  const amounts = [];
  for (const item of rows) {
    const partner = xpayText(item.partnerId, 120);
    const amount = xpayNumber(item.amount);
    if (!xpayUuid(partner) || amount <= 0) continue;
    amounts.push(amount);
    statements.push(db.prepare(`
      INSERT INTO xpay28_settlement_details
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
    UPDATE xpay28_settlement_files
    SET total_records = ?, total_amount = ?
    WHERE id = ?
  `).bind(totalRecords, totalAmount, fileId).run();

  await db.prepare(`
    INSERT INTO xpay28_upload_history
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

  // V29: satu query untuk semua transaksi yang cair pada tanggal target.
  // Query ini memakai index (settlement_date, settlement_type).
  const result = await db.prepare(`
    SELECT
      id, transaction_id, record_value, record_fee, net_amount,
      merchant, member, payment_time, payment_date, payment_sec,
      settlement_type, settlement_date, partner_id, vendor_id,
      status_excel, ticket
    FROM xpay28_transactions
    WHERE settlement_date = ?
    ORDER BY settlement_type, payment_time
  `).bind(date).all();

  const targetRows = result.results || [];
  const settlement = targetRows.filter(row => row.settlement_type === "SETTLEMENT");
  const cutoff = targetRows.filter(row => row.settlement_type === "CUTOFF");

  const yesterday = xpayAddDays(date, -1);
  const cutoffTodayResult = await db.prepare(`
    SELECT
      id, transaction_id, record_value, record_fee, net_amount,
      merchant, member, payment_time, payment_date, payment_sec,
      settlement_type, settlement_date, partner_id, vendor_id,
      status_excel, ticket
    FROM xpay28_transactions
    WHERE payment_date = ? AND settlement_type = 'CUTOFF'
    ORDER BY payment_time
  `).bind(yesterday).all();

  const cutoffToday = cutoffTodayResult.results || [];
  const s = xpaySumTransactions(settlement);
  const c = xpaySumTransactions(cutoff);
  const ct = xpaySumTransactions(cutoffToday);
  const all = targetRows.map(xpayFormatTransaction);

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
    FROM xpay28_settlement_details WHERE settlement_date = ?
  `).bind(date).first();

  if (Number(count?.cnt || 0) > 0) await xpayRunComparison(db, date);

  const result = await db.prepare(`
    SELECT settlement_date, partner_id, expected_amount, actual_amount,
           difference, status, transaction_count
    FROM xpay28_comparison_results
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
  await db.prepare("DELETE FROM xpay28_comparison_results WHERE settlement_date = ?").bind(settlementDate).run();

  const expectedRows = (await db.prepare(`
    SELECT partner_id, SUM(record_value) AS total, COUNT(*) AS count
    FROM xpay28_transactions
    WHERE settlement_date = ?
    GROUP BY partner_id
  `).bind(settlementDate).all()).results || [];

  const actualRows = (await db.prepare(`
    SELECT partner_id, SUM(amount) AS total, COUNT(*) AS count
    FROM xpay28_settlement_details
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
      INSERT INTO xpay28_comparison_results
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
    FROM xpay28_transactions
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
    const result = await db.prepare("DELETE FROM xpay28_transactions WHERE batch_id = ?").bind(batchId).run();
    deleted = Number(result.meta?.changes || 0);
  }

  await db.prepare("DELETE FROM xpay28_upload_history WHERE batch_id = ?").bind(batchId).run();
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
    SELECT * FROM xpay28_disbursements
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
    FROM xpay28_disbursements ${clause}
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
      FROM xpay28_disbursements
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
      INSERT INTO xpay28_disbursements (
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
      SELECT id, ref_id FROM xpay28_disbursements WHERE ref_id IN (${ph2})
    `).bind(...refs2).all()).results || [];
    const idMap = new Map(idRows.map(row => [row.ref_id, row.id]));
    const logs = [];
    for (const row of validRows) {
      const id = idMap.get(row.refId);
      if (!id) continue;
      if (!row.old) {
        logs.push(db.prepare(`
          INSERT INTO xpay28_disbursement_logs
            (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
          VALUES (?, ?, ?, 'INSERT', NULL, NULL, ?, ?, ?)
        `).bind(id, row.refId, batchId, row.vendorStatus, user.username, now));
      } else if (String(row.old.vendor_status) !== row.vendorStatus) {
        logs.push(db.prepare(`
          INSERT INTO xpay28_disbursement_logs
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
    INSERT INTO xpay28_upload_history
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
    FROM xpay28_upload_history
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
    FROM xpay28_disbursement_logs
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
    SELECT id, ref_id, status_done FROM xpay28_disbursements WHERE id IN (${ph})
  `).bind(...ids).all()).results || [];

  const now = Date.now();
  const statements = [];
  let changed = 0;

  for (const row of rows) {
    if (actionType === "mark" && Number(row.status_done) === 0) {
      changed += 1;
      statements.push(db.prepare("UPDATE xpay28_disbursements SET status_done=1, updated_by=?, updated_at=? WHERE id=?").bind(user.username, now, row.id));
      statements.push(db.prepare(`
        INSERT INTO xpay28_disbursement_marks (disbursement_id, ref_id, marked_by, note, marked_at)
        VALUES (?, ?, ?, NULL, ?)
      `).bind(row.id, row.ref_id, user.username, now));
      statements.push(db.prepare(`
        INSERT INTO xpay28_disbursement_logs
          (disbursement_id, ref_id, batch_id, action_type, field_name, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, '', 'MARK_DONE', 'status_done', '0', '1', ?, ?)
      `).bind(row.id, row.ref_id, user.username, now));
    } else if (actionType === "unmark" && Number(row.status_done) === 1) {
      changed += 1;
      statements.push(db.prepare("UPDATE xpay28_disbursements SET status_done=0, updated_by=?, updated_at=? WHERE id=?").bind(user.username, now, row.id));
      statements.push(db.prepare(`
        INSERT INTO xpay28_disbursement_logs
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
  const count = await db.prepare("SELECT COUNT(*) AS total FROM xpay28_disbursements WHERE batch_id=?").bind(batchId).first();
  await db.prepare(`
    DELETE FROM xpay28_disbursement_marks
    WHERE disbursement_id IN (SELECT id FROM xpay28_disbursements WHERE batch_id = ?)
  `).bind(batchId).run();
  await db.prepare(`
    DELETE FROM xpay28_disbursement_logs
    WHERE disbursement_id IN (SELECT id FROM xpay28_disbursements WHERE batch_id = ?)
  `).bind(batchId).run();
  await db.prepare("DELETE FROM xpay28_disbursements WHERE batch_id=?").bind(batchId).run();
  await db.prepare("DELETE FROM xpay28_upload_history WHERE batch_id=? AND file_type='DISBURSEMENT'").bind(batchId).run();
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
      INSERT OR IGNORE INTO xpay28_balance_history
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
      SELECT * FROM xpay28_balance_history
      WHERE substr(date_created,1,10)=?
      ORDER BY date_created DESC, id DESC
      LIMIT 10000
    `).bind(date).all();
  } else {
    result = await db.prepare(`
      SELECT * FROM xpay28_balance_history
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
    FROM xpay28_balance_history
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
  const result = await db.prepare("DELETE FROM xpay28_balance_history WHERE batch_id=?").bind(batchId).run();
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
