(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sheetUrl = $('sheetUrl');
  const loadBtn = $('loadBtn');
  const loadStatus = $('loadStatus');
  const masterSheetConfig = $('masterSheetConfig');
  const userSheetInfo = $('userSheetInfo');
  const saveSheetBtn = $('saveSheetBtn');
  const clearSheetBtn = $('clearSheetBtn');
  const saveSheetStatus = $('saveSheetStatus');
  const toggleSheetUrl = $('toggleSheetUrl');
  const pasteData = $('pasteData');
  const checkBtn = $('checkBtn');
  const copyBtn = $('copyBtn');
  const clearBtn = $('clearBtn');
  const resultBody = $('resultBody');
  const dbCount = $('dbCount');
  const checkCount = $('checkCount');
  const foundCount = $('foundCount');
  const notFoundCount = $('notFoundCount');

  let bankRows = [];
  let currentResults = [];
  let serverSheetConfigured = false;

  const BANK_WORDS = [
    'BANK JAGO','ARTHA GRAHA','CIMB NIAGA','OCBC NISP','LINKAJA',
    'MANDIRI','DANAMON','MAYBANK','PERMATA','SEABANK','SINARMAS','MUAMALAT','MAYAPADA','CITIBANK','CAPITAL',
    'BCA','BNI','BRI','BSI','CIMB','OCBC','UOB','PANIN','JAGO','HSBC','ANZ','DANA','OVO','GOPAY'
  ].sort((a,b) => b.length - a.length);

  function escapeHtml(value='') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function normalizeAccount(value='') {
    let s = String(value ?? '')
      .trim()
      .replace(/^'+/, '')
      .replace(/\s+/g, '');

    if (!s) return '';

    // Angka biasa.
    if (/^\d+$/.test(s)) return s;

    // Jika Google Sheets mengirim angka seperti 213165145146.0
    if (/^\d+\.0+$/.test(s)) {
      return s.replace(/\.0+$/, '');
    }

    // Jika Google Sheets mengirim scientific notation.
    // Contoh: 2.13165145146E+11 -> 213165145146
    const sci = s.match(/^(\d+)(?:\.(\d+))?[eE]\+?(-?\d+)$/);
    if (sci) {
      const intPart = sci[1] || '';
      const fracPart = sci[2] || '';
      const exponent = Number(sci[3] || 0);

      if (Number.isInteger(exponent)) {
        const digits = intPart + fracPart;
        const decimalPos = intPart.length + exponent;

        if (decimalPos >= digits.length) {
          return digits + '0'.repeat(decimalPos - digits.length);
        }

        if (decimalPos > 0) {
          const whole = digits.slice(0, decimalPos);
          const fraction = digits.slice(decimalPos);

          if (/^0*$/.test(fraction)) {
            return whole;
          }
        }
      }
    }

    // Format dengan pemisah titik/spasi/dash.
    return s.replace(/[^0-9]/g, '');
  }

  function normalizeName(value='') {
    return String(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function canonicalAccount(value='') {
    const digits = normalizeAccount(value);

    if (!digits) return '';

    // Leading zero tidak mengubah identitas rekening untuk proses pencarian.
    // Contoh:
    // 0031445468 == 031445468 == 31445468
    // 0690669587 == 690669587
    return digits.replace(/^0+(?=\d)/, '');
  }

  function cleanInputName(value='') {
    let s = String(value ?? '').trim();

    // Pola umum dari pesan operasional:
    // "YUNITA TRIANA, N" -> "YUNITA TRIANA"
    // "YUNITA TRIANA ,N" -> "YUNITA TRIANA"
    s = s
      .replace(/,\s*N\s*$/i, '')
      .replace(/\s+\bN\s*$/i, '')
      .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return s;
  }

  async function api(path, options={}) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: options.body ? {'Content-Type':'application/json'} : {},
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        throw new Error(`Respons server tidak valid (HTTP ${response.status}).`);
      }
    }

    if (!response.ok) {
      const details = [
        data.error || `Server error HTTP ${response.status}.`,
        data.stage ? `Tahap: ${data.stage}` : '',
        data.detail ? `Detail: ${data.detail}` : ''
      ].filter(Boolean);

      const error = new Error(details.join(' • '));
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function setLoadStatus(message, type='') {
    loadStatus.textContent = message;
    loadStatus.className = 'status' + (type ? ' ' + type : '');
  }

  function setSaveStatus(message, type='') {
    saveSheetStatus.textContent = message;
    saveSheetStatus.className =
      'status' + (type ? ' ' + type : '');
    saveSheetStatus.classList.remove('hidden');
  }

  function clearLoadedBankState(message='Belum ada database BANK yang dimuat.') {
    bankRows = [];
    currentResults = [];

    dbCount.textContent = '0';
    checkCount.textContent = '0';
    foundCount.textContent = '0';
    notFoundCount.textContent = '0';

    resultBody.innerHTML =
      '<tr><td colspan="4" class="empty">Belum ada hasil pengecekan.</td></tr>';

    setLoadStatus(message, '');
  }

  async function initializeCheckerAccess() {
    try {
      const session = await api('/api/session');

      if (!session.authenticated) {
        throw new Error('Sesi login habis. Silakan login ulang.');
      }

      if (session.user?.isMaster) {
        masterSheetConfig.classList.remove('hidden');
        userSheetInfo.classList.add('hidden');

        try {
          const config = await api('/api/checker-bank/config');

          serverSheetConfigured = Boolean(config.configured);
          sheetUrl.value = config.url || '';

          if (serverSheetConfigured) {
            setSaveStatus(
              'Link spreadsheet tersimpan di server.',
              'ok'
            );

            // Master hanya auto-load jika memang ada link aktif di server.
            await loadBankSheet();
          } else {
            setSaveStatus(
              'Belum ada link spreadsheet. Masukkan link lalu klik SIMPAN LINK.',
              'wait'
            );

            clearLoadedBankState(
              'Belum ada database BANK karena link spreadsheet belum disimpan.'
            );
          }
        } catch (error) {
          serverSheetConfigured = false;
          sheetUrl.value = '';

          setSaveStatus(error.message, 'err');

          clearLoadedBankState(
            'Database BANK belum dimuat karena konfigurasi link tidak dapat dibaca.'
          );
        }
      } else {
        masterSheetConfig.classList.add('hidden');
        userSheetInfo.classList.remove('hidden');

        // User biasa tidak melihat URL, jadi server yang menentukan
        // apakah database BANK tersedia.
        await loadBankSheet();
      }
    } catch (error) {
      clearLoadedBankState(error.message);
      loadStatus.className = 'status err';
      loadBtn.disabled = false;
    }
  }

  async function saveSheetConfig() {
    const url = String(sheetUrl.value || '').trim();

    if (!url) {
      setSaveStatus(
        serverSheetConfigured
          ? 'Input kosong. Link lama masih tersimpan di server. Tekan HAPUS LINK jika ingin menghapusnya.'
          : 'Masukkan Link Google Spreadsheet terlebih dahulu.',
        'err'
      );
      return;
    }

    saveSheetBtn.disabled = true;
    if (clearSheetBtn) clearSheetBtn.disabled = true;

    setSaveStatus('Menyimpan link ke server...', 'wait');

    try {
      const result = await api('/api/checker-bank/config', {
        method: 'PUT',
        body: { url }
      });

      serverSheetConfigured = true;
      sheetUrl.value = result.url || url;

      setSaveStatus(
        'Link berhasil disimpan di server.',
        'ok'
      );

      await loadBankSheet();
    } catch (error) {
      setSaveStatus(error.message, 'err');
    } finally {
      saveSheetBtn.disabled = false;
      if (clearSheetBtn) clearSheetBtn.disabled = false;
    }
  }

  async function clearSheetConfig() {
    if (!serverSheetConfigured) {
      sheetUrl.value = '';
      clearLoadedBankState(
        'Belum ada database BANK karena link spreadsheet belum disimpan.'
      );
      setSaveStatus(
        'Tidak ada link spreadsheet yang tersimpan di server.',
        'wait'
      );
      return;
    }

    const confirmed = window.confirm(
      'Hapus link Google Spreadsheet Checker dari server? Database BANK yang sedang dimuat juga akan dikosongkan.'
    );

    if (!confirmed) return;

    saveSheetBtn.disabled = true;
    if (clearSheetBtn) clearSheetBtn.disabled = true;

    setSaveStatus('Menghapus link dari server...', 'wait');

    try {
      await api('/api/checker-bank/config', {
        method: 'DELETE'
      });

      serverSheetConfigured = false;
      sheetUrl.value = '';

      clearLoadedBankState(
        'Belum ada database BANK karena link spreadsheet sudah dihapus.'
      );

      setSaveStatus(
        'Link spreadsheet berhasil dihapus dari server.',
        'ok'
      );
    } catch (error) {
      setSaveStatus(error.message, 'err');
    } finally {
      saveSheetBtn.disabled = false;
      if (clearSheetBtn) clearSheetBtn.disabled = false;
    }
  }

  async function loadBankSheet() {
    loadBtn.disabled = true;
    setLoadStatus(
      'Server sedang membaca database BANK dari Google Spreadsheet...',
      'wait'
    );

    try {
      const data = await api('/api/checker-bank/data');

      bankRows = Array.isArray(data.rows)
        ? data.rows.map((row, index) => ({
            row: Number(row.row || index + 1),
            name: String(row.name || '').trim(),
            account: normalizeAccount(row.account || ''),
            status: String(row.status || '').trim()
          }))
        : [];

      if (!bankRows.length) {
        throw new Error(
          'Sheet BANK terbaca, tetapi kolom A:B:C tidak mempunyai data.'
        );
      }

      dbCount.textContent = bankRows.length;
      setLoadStatus(
        `BANK!AM2:AO5000 • ${bankRows.length} baris rekening • AM nama: ${Number(data.nameRows || 0)} • AN nomor: ${Number(data.accountRows || 0)} • AO status: ${Number(data.statusRows || 0)} • unik: ${Number(data.uniqueAccounts || 0)} • duplikat nomor: ${Number(data.duplicateAccounts || 0)} • mode: ${String(data.sourceMode || '-')}.`,
        'ok'
      );
    } catch (error) {
      bankRows = [];
      dbCount.textContent = '0';
      setLoadStatus(error.message, 'err');
    } finally {
      loadBtn.disabled = false;
    }
  }

  function cleanInputLine(line='') {
    let s = String(line).trim();
    if (!s) return '';
    s = s.replace(/^[-*]+\s*/, '').trim();
    if (!/\d/.test(s)) return '';
    if (/^\|?\s*:?-{3,}/.test(s)) return '';
    s = s.replace(/^\|/, '').replace(/\|$/, '').trim();
    return s;
  }

  function detectBankPrefix(text='') {
    const s = String(text).trim();
    const upper = s.toUpperCase();
    for (const bank of BANK_WORDS) {
      if (upper === bank || upper.startsWith(bank + ' ') || upper.startsWith(bank + '\t')) {
        return { bank, rest: s.slice(bank.length).trim() };
      }
    }
    return { bank: '', rest: s };
  }

  function parseInputLine(raw) {
    let s = cleanInputLine(raw);
    if (!s) return null;

    if (s.includes('|')) {
      const cells = s.split('|').map(x => x.trim()).filter(Boolean);
      if (cells.length >= 2) s = cells.join('\t');
    }

    // Jika hasil paste dari spreadsheet, biasanya terpisah TAB.
    const tabs = s.split(/\t+/).map(x => x.trim()).filter(Boolean);
    if (tabs.length >= 2) {
      const account = normalizeAccount(tabs[tabs.length - 1]);
      if (!account) return null;

      if (tabs.length >= 3) {
        return {
          bank: tabs[0],
          name: cleanInputName(tabs.slice(1, -1).join(' ').trim()),
          account
        };
      }

      const d = detectBankPrefix(tabs[0]);
      return { bank: d.bank, name: cleanInputName(d.rest), account };
    }

    // Format satu baris: BCA Muhammad Rama Rusyana 1790399273
    const m = s.match(/(?:^|\s)([0-9][0-9 .-]*[0-9]|[0-9]+)\s*$/);
    if (!m) return null;

    const account = normalizeAccount(m[1]);
    if (!account) return null;
    const before = s.slice(0, m.index).trim();
    const d = detectBankPrefix(before);
    return { bank: d.bank, name: cleanInputName(d.rest), account };
  }

  function detectBankNearAccount(text='', startIndex=0) {
    const before = String(text || '')
      .slice(Math.max(0, startIndex - 120), startIndex)
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const upper = before.toUpperCase();
    let best = '';
    let bestIndex = -1;

    for (const bank of BANK_WORDS) {
      const idx = upper.lastIndexOf(bank);
      if (idx > bestIndex) {
        bestIndex = idx;
        best = bank;
      }
    }

    return best;
  }

  function extractAccountItems(rawText='') {
    const text = String(rawText || '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ');

    const items = [];
    const seen = new Set();

    const pushAccount = (accountValue, bank='', name='') => {
      const account = normalizeAccount(accountValue);
      const canonical = canonicalAccount(account);

      if (!account || !canonical) return;

      // Nomor rekening operasional pada database minimal 6 digit.
      // Ini mencegah angka pendek dari teks lain ikut dianggap rekening.
      if (canonical.length < 6 || canonical.length > 22) return;

      if (seen.has(canonical)) return;
      seen.add(canonical);

      items.push({
        bank: String(bank || '').trim(),
        name: cleanInputName(name || ''),
        account
      });
    };

    // Tahap 1: parser per baris tetap dipakai agar BANK dari input terbaca.
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseInputLine(line);
      if (parsed?.account) {
        pushAccount(parsed.account, parsed.bank, parsed.name);
      }
    }

    // Tahap 2: scan SEMUA nomor rekening di seluruh text.
    // Ini yang menangani paste WhatsApp/Telegram yang seluruh datanya
    // berubah menjadi satu baris panjang.
    // Nama rekening sengaja tidak dibutuhkan untuk matching.
    const accountPattern = /(?:['’])?(?:\d{6,22}(?:\.0+)?|\d+(?:\.\d+)?[eE][+-]?\d+)/g;
    let match;

    while ((match = accountPattern.exec(text)) !== null) {
      pushAccount(
        match[0],
        detectBankNearAccount(text, match.index),
        ''
      );
    }

    return items;
  }

  function findMatch(item) {
    // V67:
    // MATCH 100% HANYA BERDASARKAN NOMOR REKENING.
    // Nama rekening TIDAK dipakai untuk menentukan cocok/tidak.
    //
    // Leading zero juga diabaikan:
    // 31445468 == 0031445468
    // 690669587 == 0690669587

    const rawAccount = normalizeAccount(item.account);
    const canonical = canonicalAccount(item.account);

    if (!rawAccount || !canonical) {
      return null;
    }

    // Prioritas 1: nomor persis.
    const exact = bankRows.find(row =>
      normalizeAccount(row.account) === rawAccount
    );

    if (exact) {
      return {
        row: exact,
        method: 'ACCOUNT_EXACT'
      };
    }

    // Prioritas 2: nomor sama setelah leading zero dibuang.
    const canonicalMatches = bankRows.filter(row =>
      canonicalAccount(row.account) === canonical
    );

    if (canonicalMatches.length) {
      return {
        row: canonicalMatches[0],
        method: 'ACCOUNT_LEADING_ZERO'
      };
    }

    return null;
  }

  function statusClass(status='') {
    const s = String(status).toUpperCase();
    if (s.includes('BERMASALAH') || s.includes('CABUT') || s.includes('OFF')) return 'bad';
    if (s.includes('AKTIF') || s.includes('ACTIVE') || s.includes('ON')) return 'ok';
    return 'warn';
  }

  function checkData() {
    if (!bankRows.length) {
      alert('Klik BACA SHEET BANK terlebih dahulu sampai database berhasil dimuat.');
      return;
    }

    // V67: yang dicek hanya NOMOR REKENING.
    // Tidak peduli nama beda/typo, tidak peduli data satu baris atau banyak baris.
    const items = extractAccountItems(pasteData.value);

    currentResults = items.map(item => {
      const found = findMatch(item);

      return {
        item,
        match: found?.row || null,
        matchMethod: found?.method || ''
      };
    });

    checkCount.textContent = currentResults.length;
    const found = currentResults.filter(x => x.match).length;
    foundCount.textContent = found;
    notFoundCount.textContent = currentResults.length - found;
    renderResults();
  }

  function renderResults() {
    const foundResults = currentResults.filter(x => x.match);

    if (!foundResults.length) {
      resultBody.innerHTML = '<tr><td colspan="4" class="empty"><b>Kosong ya bos</b></td></tr>';
      return;
    }

    // BANK mengikuti data tempelan.
    // Nama, nomor rekening dan status mengikuti sheet BANK.
    // Jadi leading zero asli dari database tetap terlihat di hasil.
    resultBody.innerHTML = foundResults.map(({item, match}) => `<tr>
      <td><b>${escapeHtml(item.bank || '-')}</b></td>
      <td><b>${escapeHtml(match.name || item.name)}</b></td>
      <td class="mono">${escapeHtml(match.account || item.account)}</td>
      <td><span class="tag ${statusClass(match.status)}">${escapeHtml(match.status || 'TANPA KETERANGAN')}</span></td>
    </tr>`).join('');
  }

  async function copyResults() {
    const foundResults = currentResults.filter(x => x.match);
    if (!foundResults.length) {
      alert('Kosong ya bos');
      return;
    }

    const rows = foundResults.map(({item, match}) =>
      `${item.bank || ''}\t${match.name || item.name}\t${match.account || item.account}\t${match.status}`
    );

    const text = ['BANK\tNAMA REKENING\tNOMOR REKENING\tSTATUS', ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    const old = copyBtn.textContent;
    copyBtn.textContent = 'TERSALIN ✓';
    setTimeout(() => copyBtn.textContent = old, 1200);
  }

  function clearInput() {
    pasteData.value = '';
    currentResults = [];
    checkCount.textContent = '0';
    foundCount.textContent = '0';
    notFoundCount.textContent = '0';
    resultBody.innerHTML = '<tr><td colspan="4" class="empty">Belum ada hasil.</td></tr>';
    pasteData.focus();
  }

  loadBtn.addEventListener('click', () => {
    if (
      !masterSheetConfig.classList.contains('hidden') &&
      !serverSheetConfigured
    ) {
      clearLoadedBankState(
        'Belum ada database BANK. Simpan link Google Spreadsheet terlebih dahulu.'
      );
      loadStatus.className = 'status err';
      return;
    }

    loadBankSheet();
  });
  checkBtn.addEventListener('click', checkData);
  copyBtn.addEventListener('click', copyResults);
  clearBtn.addEventListener('click', clearInput);

  saveSheetBtn.addEventListener('click', saveSheetConfig);

  clearSheetBtn?.addEventListener(
    'click',
    clearSheetConfig
  );

  toggleSheetUrl.addEventListener('click', () => {
    const visible = sheetUrl.type === 'text';
    sheetUrl.type = visible ? 'password' : 'text';
    toggleSheetUrl.textContent = visible ? 'LIHAT LINK' : 'SEMBUNYIKAN';
  });

  initializeCheckerAccess();
})();