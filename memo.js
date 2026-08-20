/* MEMO DATABASE V32 — Cloudflare D1 */

let memos = [];
let allMemosVisible = false;
let recycleBinVisible = false;
let statusTimeout = null;

const MEMO_API = '/api/memos';

async function memoApi(path = '', options = {}) {
    const response = await fetch(MEMO_API + path, {
        method: options.method || 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: options.body
            ? { 'Accept': 'application/json', 'Content-Type': 'application/json' }
            : { 'Accept': 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const raw = await response.text();
    let payload = {};

    if (raw) {
        try { payload = JSON.parse(raw); }
        catch (_) { throw new Error(`Server MEMO mengembalikan respons tidak valid (HTTP ${response.status}).`); }
    }

    if (!response.ok) throw new Error(payload.error || `MEMO HTTP ${response.status}.`);
    return payload;
}

async function loadDatabase(callback = null) {
    try {
        const payload = await memoApi();
        memos = Array.isArray(payload.memos) ? payload.memos : [];
        memos = memos.map(memo => ({ ...memo, deleted: memo.deleted === true }));
        memos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        if (typeof callback === 'function') callback();
    } catch (error) {
        showStatus(error.message || String(error), false);
    }
}

function getActiveMemos() { return memos.filter(memo => !memo.deleted); }
function getTrashMemos() {
    return memos.filter(memo => memo.deleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function saveMemo() {
    const keyword = document.getElementById('keyword').value.trim();
    const content = document.getElementById('content').value.trim();
    const editId = document.getElementById('editId').value;

    if (!keyword) {
        showStatus('Kata kunci belum diisi.', false);
        document.getElementById('keyword').focus();
        return;
    }
    if (!content) {
        showStatus('Isi memo belum diisi.', false);
        document.getElementById('content').focus();
        return;
    }

    const button = document.getElementById('saveButton');
    button.disabled = true;
    button.innerHTML = 'MENYIMPAN...';

    try {
        if (editId) {
            await memoApi('/' + encodeURIComponent(editId), {
                method: 'PUT', body: { keyword, content }
            });
        } else {
            await memoApi('', {
                method: 'POST', body: { keyword, content }
            });
        }

        const wasEdit = !!editId;
        resetForm(false);
        await loadDatabase();
        clearResult();
        showStatus(wasEdit ? '✓ Memo berhasil diperbarui.' : '✓ Memo berhasil disimpan ke database.', true);
    } catch (error) {
        showStatus(error.message || String(error), false);
    } finally {
        button.disabled = false;
        button.innerHTML = '💾 SIMPAN';
    }
}

function searchMemos() {
    closeViewButtons();
    const searchInput = document.getElementById('search').value.trim();
    const search = normalize(searchInput);
    document.getElementById('resultTitle').textContent = 'Hasil Pencarian';

    if (!search) {
        document.getElementById('results').innerHTML = '<div class="empty">Masukkan kata yang ingin dicari.</div>';
        hideCount();
        return;
    }

    const words = search.split(' ').filter(Boolean);
    const result = getActiveMemos()
        .map(memo => {
            const keyword = normalize(memo.keyword);
            const content = normalize(memo.content);
            const combined = keyword + ' ' + content;
            if (!words.every(word => combined.includes(word))) return null;

            let score = 0;
            words.forEach(word => {
                if (keyword.includes(word)) score += 20;
                if (content.includes(word)) score += 2;
            });
            if (keyword.includes(search)) score += 50;
            if (words.every(word => keyword.includes(word))) score += 40;
            return { memo, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score !== a.score ? b.score - a.score : (b.memo.updatedAt || 0) - (a.memo.updatedAt || 0))
        .map(item => item.memo);

    renderMemos(result);
}

document.getElementById('search').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchMemos();
    }
});

function toggleAllMemos() {
    if (allMemosVisible) { clearResult(); return; }
    recycleBinVisible = false;
    document.getElementById('trashButton').innerHTML = '🗑 RECYCLE BIN';
    document.getElementById('search').value = '';
    document.getElementById('resultTitle').textContent = 'Semua Memo';
    renderMemos(getActiveMemos());
    allMemosVisible = true;
    document.getElementById('toggleAllButton').innerHTML = '🙈 TUTUP SEMUA';
}

function toggleRecycleBin() {
    if (recycleBinVisible) { clearResult(); return; }
    allMemosVisible = false;
    document.getElementById('toggleAllButton').innerHTML = '👁 LIHAT SEMUA';
    document.getElementById('search').value = '';
    document.getElementById('resultTitle').textContent = 'Recycle Bin';
    recycleBinVisible = true;
    document.getElementById('trashButton').innerHTML = '🙈 TUTUP RECYCLE BIN';
    renderRecycleBin();
}

function renderMemos(data) {
    const results = document.getElementById('results');
    const count = document.getElementById('memoCount');
    count.style.display = 'inline-block';
    count.textContent = data.length + ' Memo';

    if (!data.length) {
        results.innerHTML = '<div class="empty">Memo tidak ditemukan.</div>';
        return;
    }

    results.innerHTML = data.map(memo => `
        <div class="memo">
            <div class="memo-keyword">${escapeHTML(memo.keyword)}</div>
            <div class="memo-content">${escapeHTML(memo.content)}</div>
            <div class="memo-actions">
                <button class="btn-green" onclick="copyMemo(${memo.id})">📋 COPY</button>
                <button class="btn-gray" onclick="editMemo(${memo.id})">✏ EDIT</button>
                <button class="btn-red" onclick="moveToTrash(${memo.id})">🗑 HAPUS</button>
            </div>
        </div>`).join('');
}

function renderRecycleBin() {
    const data = getTrashMemos();
    const results = document.getElementById('results');
    const count = document.getElementById('memoCount');
    count.style.display = 'inline-block';
    count.textContent = data.length + ' Memo';

    if (!data.length) {
        results.innerHTML = '<div class="empty">🗑 Recycle Bin kosong.</div>';
        return;
    }

    results.innerHTML = `
        <div class="trash-toolbar"><button class="btn-red" onclick="emptyRecycleBin()">🗑 KOSONGKAN RECYCLE BIN</button></div>
        ${data.map(memo => `
            <div class="memo trash">
                <div class="memo-keyword">🗑 ${escapeHTML(memo.keyword)}</div>
                <div class="memo-content">${escapeHTML(memo.content)}</div>
                <div class="memo-actions">
                    <button class="btn-green" onclick="restoreMemo(${memo.id})">♻ PULIHKAN</button>
                    <button class="btn-red" onclick="permanentDelete(${memo.id})">❌ HAPUS PERMANEN</button>
                </div>
            </div>`).join('')}`;
}

async function moveToTrash(id) {
    const memo = memos.find(item => item.id === id);
    if (!memo) return;
    if (!confirm('Pindahkan memo ke Recycle Bin?\n\n' + memo.keyword)) return;
    try {
        await memoApi('/' + id + '/trash', { method: 'POST' });
        await loadDatabase();
        clearResult();
        showStatus('✓ Memo dipindahkan ke Recycle Bin.', true);
    } catch (error) { showStatus(error.message || String(error), false); }
}

async function restoreMemo(id) {
    try {
        await memoApi('/' + id + '/restore', { method: 'POST' });
        await loadDatabase();
        renderRecycleBin();
        showStatus('✓ Memo berhasil dipulihkan.', true);
    } catch (error) { showStatus(error.message || String(error), false); }
}

async function permanentDelete(id) {
    const memo = memos.find(item => item.id === id);
    if (!memo) return;
    if (!confirm('HAPUS PERMANEN memo ini?\n\n' + memo.keyword + '\n\nData tidak dapat dipulihkan lagi.')) return;
    try {
        await memoApi('/' + id, { method: 'DELETE' });
        await loadDatabase();
        renderRecycleBin();
        showStatus('✓ Memo dihapus permanen.', true);
    } catch (error) { showStatus(error.message || String(error), false); }
}

async function emptyRecycleBin() {
    const trash = getTrashMemos();
    if (!trash.length) return;
    if (!confirm('Kosongkan seluruh Recycle Bin?\n\n' + trash.length + ' memo akan dihapus permanen.')) return;
    try {
        await memoApi('/trash', { method: 'DELETE' });
        await loadDatabase();
        renderRecycleBin();
        showStatus('✓ Recycle Bin berhasil dikosongkan.', true);
    } catch (error) { showStatus(error.message || String(error), false); }
}

async function copyMemo(id) {
    const memo = memos.find(item => item.id === id);
    if (!memo) return;
    try { await navigator.clipboard.writeText(memo.content); }
    catch (_) {
        const textarea = document.createElement('textarea');
        textarea.value = memo.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }
    showStatus('✓ Isi memo berhasil dicopy.', true);
}

function editMemo(id) {
    const memo = memos.find(item => item.id === id && !item.deleted);
    if (!memo) return;
    document.getElementById('editId').value = memo.id;
    document.getElementById('keyword').value = memo.keyword;
    document.getElementById('content').value = memo.content;
    document.getElementById('formTitle').textContent = 'Edit Memo';
    document.getElementById('saveButton').innerHTML = '💾 UPDATE';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('keyword').focus();
}

function resetForm(clearStatus = true) {
    document.getElementById('editId').value = '';
    document.getElementById('keyword').value = '';
    document.getElementById('content').value = '';
    document.getElementById('formTitle').textContent = 'Tambah Memo';
    document.getElementById('saveButton').innerHTML = '💾 SIMPAN';
    if (clearStatus) document.getElementById('status').textContent = '';
}

function closeViewButtons() {
    allMemosVisible = false;
    recycleBinVisible = false;
    document.getElementById('toggleAllButton').innerHTML = '👁 LIHAT SEMUA';
    document.getElementById('trashButton').innerHTML = '🗑 RECYCLE BIN';
}

function clearResult() {
    closeViewButtons();
    document.getElementById('results').innerHTML = '<div class="empty">Memo masih disembunyikan.<br><br>Gunakan Search, LIHAT SEMUA atau RECYCLE BIN.</div>';
    hideCount();
    document.getElementById('resultTitle').textContent = 'Memo';
    document.getElementById('search').value = '';
}

function hideCount() { document.getElementById('memoCount').style.display = 'none'; }

function showStatus(message, success = true) {
    const status = document.getElementById('status');
    status.style.color = success ? '#78d6ad' : '#ff7d86';
    status.textContent = message;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => { status.textContent = ''; }, 4000);
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

loadDatabase();
