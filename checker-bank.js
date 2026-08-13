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
    } catch (error) {
      setLoadStatus(error.message, 'err');
      loadBtn.disabled = true;
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
    // BANK dari data tempelan TIDAK ikut dicocokkan karena sheet BANK hanya punya:
    // A = Nama, B = Nomor Rekening, C = Status.
    // Agar benar-benar "data yang sama", Nama + Nomor Rekening harus sama.
    const account = normalizeAccount(item.account);
    const name = normalizeName(item.name);
    if (!account || !name) return null;

    return bankRows.find(r =>
      normalizeAccount(r.account) === account &&
      normalizeName(r.name) === name
    ) || null;
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
      resultBody.innerHTML = '<tr><td colspan="4" class="empty"><b>Kosong ya bos</b></td></tr>';
      return;
    }

    // BANK, NAMA dan NOMOR ditampilkan mengikuti data yang ditempel.
    // STATUS diambil dari sheet BANK.
    resultBody.innerHTML = foundResults.map(({item, match}) => `<tr>
      <td><b>${escapeHtml(item.bank || '-')}</b></td>
      <td><b>${escapeHtml(item.name)}</b></td>
      <td class="mono">${escapeHtml(item.account)}</td>
      <td><span class="tag ${statusClass(match.status)}">${escapeHtml(match.status || 'TANPA KETERANGAN')}</span></td>
    </tr>`).join('');
  }

  async function copyResults() {
    const foundResults = currentResults.filter(x => x.match);
    if (!foundResults.length) {
      alert('Kosong ya bos');
      return;
    }

    const rows = foundResults.map(({item, match}) => `${item.bank || ''}\t${item.name}\t${item.account}\t${match.status}`);

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