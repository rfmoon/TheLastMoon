(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const sheetUrl = $('sheetUrl');
  const loadBtn = $('loadBtn');
  const loadStatus = $('loadStatus');
  const masterSheetConfig = $('masterSheetConfig');
  const userSheetInfo = $('userSheetInfo');
  const saveSheetBtn = $('saveSheetBtn');
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
          sheetUrl.value = config.url || '';

          if (config.configured) {
            setSaveStatus(
              'Link spreadsheet tersimpan di server.',
              'ok'
            );
          } else {
            setSaveStatus(
              'Belum ada link spreadsheet. Masukkan link lalu klik SIMPAN LINK.',
              'wait'
            );
          }
        } catch (error) {
          setSaveStatus(error.message, 'err');
        }
      } else {
        masterSheetConfig.classList.add('hidden');
        userSheetInfo.classList.remove('hidden');
      }

      // Otomatis baca BANK saat Checker dibuka.
      // Tombol BACA SHEET BANK tetap tersedia untuk refresh manual.
      await loadBankSheet();
    } catch (error) {
      setLoadStatus(error.message, 'err');
      loadBtn.disabled = false;
    }
  }

  async function saveSheetConfig() {
    const url = String(sheetUrl.value || '').trim();

    if (!url) {
      setSaveStatus(
        'Masukkan Link Google Spreadsheet terlebih dahulu.',
        'err'
      );
      return;
    }

    saveSheetBtn.disabled = true;
    setSaveStatus('Menyimpan link ke server...', 'wait');

    try {
      const result = await api('/api/checker-bank/config', {
        method: 'PUT',
        body: { url }
      });

      sheetUrl.value = result.url || url;
      setSaveStatus(
        'Link berhasil disimpan. User biasa tetap tidak dapat melihat link ini.',
        'ok'
      );

      // Setelah link diganti, langsung refresh database BANK.
      await loadBankSheet();
    } catch (error) {
      setSaveStatus(error.message, 'err');
    } finally {
      saveSheetBtn.disabled = false;
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
        `Berhasil membaca ${bankRows.length} rekening dari sheet BANK.`,
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

  function findMatch(item) {
    // V65:
    // MATCH HANYA BERDASARKAN NOMOR REKENING.
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

    const items = pasteData.value.split(/\r?\n/).map(parseInputLine).filter(Boolean);
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

  loadBtn.addEventListener('click', loadBankSheet);
  checkBtn.addEventListener('click', checkData);
  copyBtn.addEventListener('click', copyResults);
  clearBtn.addEventListener('click', clearInput);

  saveSheetBtn.addEventListener('click', saveSheetConfig);

  toggleSheetUrl.addEventListener('click', () => {
    const visible = sheetUrl.type === 'text';
    sheetUrl.type = visible ? 'password' : 'text';
    toggleSheetUrl.textContent = visible ? 'LIHAT LINK' : 'SEMBUNYIKAN';
  });

  initializeCheckerAccess();
})();