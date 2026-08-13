(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sheetUrl = $('sheetUrl');
  const loadBtn = $('loadBtn');
  const loadStatus = $('loadStatus');
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

  const BANK_WORDS = [
    'BANK JAGO','ARTHA GRAHA','CIMB NIAGA','OCBC NISP','LINKAJA',
    'MANDIRI','DANAMON','MAYBANK','PERMATA','SEABANK','SINARMAS','MUAMALAT','MAYAPADA','CITIBANK','CAPITAL',
    'BCA','BNI','BRI','BSI','CIMB','OCBC','UOB','PANIN','JAGO','HSBC','ANZ','DANA','OVO','GOPAY'
  ].sort((a,b) => b.length - a.length);

  function escapeHtml(value='') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function normalizeAccount(value='') {
    return String(value).trim().replace(/^'+/, '').replace(/[^0-9]/g, '');
  }

  function normalizeName(value='') {
    return String(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function extractSpreadsheetId(value='') {
    const s = String(value).trim();
    const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    return '';
  }

  function setLoadStatus(message, type='') {
    loadStatus.textContent = message;
    loadStatus.className = 'status' + (type ? ' ' + type : '');
  }

  function cellText(cell) {
    if (!cell) return '';
    // Untuk kolom Plain Text, c.v berupa string. c.f dipakai jika tersedia.
    if (cell.f !== undefined && cell.f !== null && cell.f !== '') return String(cell.f).trim();
    if (cell.v === undefined || cell.v === null) return '';
    return String(cell.v).trim();
  }

  function buildBankRowsFromGviz(response) {
    if (!response || response.status === 'error') {
      const msg = response?.errors?.[0]?.detailed_message || response?.errors?.[0]?.message || 'Google Sheets mengembalikan error.';
      throw new Error(msg);
    }

    const rows = response?.table?.rows || [];
    const parsed = rows.map((row, index) => {
      const cells = row.c || [];
      const name = cellText(cells[0]);
      const account = normalizeAccount(cellText(cells[1]));
      const status = cellText(cells[2]);
      return { row: index + 1, name, account, status };
    }).filter(r => r.name || r.account || r.status);

    return parsed.filter(r => {
      const n = normalizeName(r.name);
      const a = normalizeName(r.account);
      return !(n.includes('NAMA') && (a.includes('NOMOR') || normalizeName(r.status).includes('STATUS')));
    });
  }

  function loadViaJsonp(spreadsheetId) {
    return new Promise((resolve, reject) => {
      const callbackName = '__bankGviz_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      let finished = false;
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error('Akses Google Sheets belum diizinkan atau koneksi terlalu lama.'));
      }, 20000);

      function cleanup() {
        clearTimeout(timeout);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.remove();
      }

      window[callbackName] = response => {
        if (finished) return;
        finished = true;
        try {
          const rows = buildBankRowsFromGviz(response);
          cleanup();
          resolve(rows);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      script.onerror = () => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error('Tidak dapat terhubung ke Google Sheets.'));
      };

      const tqx = encodeURIComponent('out:json;responseHandler:' + callbackName);
      script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=${encodeURIComponent('BANK')}&tqx=${tqx}&_=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  async function loadBankSheet() {
    const id = extractSpreadsheetId(sheetUrl.value);
    if (!id) {
      setLoadStatus('Link Google Spreadsheet tidak valid.', 'err');
      return;
    }

    localStorage.setItem('bankSheetUrl', sheetUrl.value.trim());
    loadBtn.disabled = true;
    setLoadStatus('Menghubungkan ke Google Sheets dan membaca sheet BANK...', 'wait');

    try {
      bankRows = await loadViaJsonp(id);
      if (!bankRows.length) throw new Error('Sheet BANK terbaca, tetapi kolom A:B:C tidak mempunyai data.');

      dbCount.textContent = bankRows.length;
      setLoadStatus(`Berhasil membaca ${bankRows.length} rekening dari sheet BANK.`, 'ok');
    } catch (err) {
      bankRows = [];
      dbCount.textContent = '0';
      setLoadStatus(
        `Belum dapat membaca sheet BANK. ${err.message} Jika muncul “Allow network access?”, pilih Allow. Pastikan Spreadsheet dapat dilihat dari browser ini dan sheet bernama BANK.`,
        'err'
      );
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
          name: tabs.slice(1, -1).join(' ').trim(),
          account
        };
      }

      const d = detectBankPrefix(tabs[0]);
      return { bank: d.bank, name: d.rest, account };
    }

    // Format satu baris: BCA Muhammad Rama Rusyana 1790399273
    const m = s.match(/(?:^|\s)([0-9][0-9 .-]*[0-9]|[0-9]+)\s*$/);
    if (!m) return null;

    const account = normalizeAccount(m[1]);
    if (!account) return null;
    const before = s.slice(0, m.index).trim();
    const d = detectBankPrefix(before);
    return { bank: d.bank, name: d.rest, account };
  }

  function findMatch(item) {
    const account = normalizeAccount(item.account);
    if (account) {
      const exactAccount = bankRows.find(r => normalizeAccount(r.account) === account);
      if (exactAccount) return exactAccount;
    }

    // Nama hanya dipakai sebagai cadangan bila nomor tidak ketemu.
    const name = normalizeName(item.name);
    if (name) {
      const sameNames = bankRows.filter(r => normalizeName(r.name) === name);
      if (sameNames.length === 1) return sameNames[0];
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

    const items = pasteData.value.split(/\r?\n/).map(parseInputLine).filter(Boolean);
    currentResults = items.map(item => ({ item, match: findMatch(item) }));

    checkCount.textContent = currentResults.length;
    const found = currentResults.filter(x => x.match).length;
    foundCount.textContent = found;
    notFoundCount.textContent = currentResults.length - found;
    renderResults();
  }

  function renderResults() {
    const foundResults = currentResults.filter(x => x.match);

    if (!foundResults.length) {
      resultBody.innerHTML = '<tr><td colspan="3" class="empty"><b>Kosong ya bos</b></td></tr>';
      return;
    }

    resultBody.innerHTML = foundResults.map(({match}) => `<tr>
      <td><b>${escapeHtml(match.name)}</b></td>
      <td class="mono">${escapeHtml(match.account)}</td>
      <td><span class="tag ${statusClass(match.status)}">${escapeHtml(match.status || 'TANPA KETERANGAN')}</span></td>
    </tr>`).join('');
  }

  async function copyResults() {
    const foundResults = currentResults.filter(x => x.match);
    if (!foundResults.length) {
      alert('Kosong ya bos');
      return;
    }

    const rows = foundResults.map(({match}) => `${match.name}\t${match.account}\t${match.status}`);

    const text = ['NAMA REKENING\tNOMOR REKENING\tSTATUS', ...rows].join('\n');
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
    resultBody.innerHTML = '<tr><td colspan="3" class="empty">Belum ada hasil.</td></tr>';
    pasteData.focus();
  }

  loadBtn.addEventListener('click', loadBankSheet);
  checkBtn.addEventListener('click', checkData);
  copyBtn.addEventListener('click', copyResults);
  clearBtn.addEventListener('click', clearInput);

  const saved = localStorage.getItem('bankSheetUrl');
  if (saved) sheetUrl.value = saved;
})();