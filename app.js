const state = {
  user: null,
  menus: [],
  currentMenu: "dashboard",
  users: [],
  appearance: {
    backgroundUrls: [],
    backgroundUrl: "",
    overlay: 58,
    blur: 2,
    slideSeconds: 8
  },
  pendingConfirm: null
};

let backgroundTimer = null;
let backgroundIndex = 0;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  bindEvents();
  await loadPublicSettings();
  await restoreSession();
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", login);
  $("#logoutButton").addEventListener("click", logout);
  $("#accountButton").addEventListener("click", () => openModal("passwordModal"));
  $("#passwordForm").addEventListener("submit", changePassword);
  $("#userForm").addEventListener("submit", saveUser);

  $("#openSidebar").addEventListener("click", openSidebar);
  $("#closeSidebar").addEventListener("click", closeSidebar);
  $("#sidebarOverlay").addEventListener("click", closeSidebar);

  $("#selectAllPermissions").addEventListener("click", () => {
    $$(".permission-check").forEach(input => input.checked = true);
  });
  $("#clearPermissions").addEventListener("click", () => {
    $$(".permission-check").forEach(input => input.checked = false);
  });

  $("#confirmButton").addEventListener("click", async () => {
    const action = state.pendingConfirm;
    state.pendingConfirm = null;
    closeModal("confirmModal");
    if (typeof action === "function") await action();
  });

  document.addEventListener("click", event => {
    const closer = event.target.closest("[data-close-modal]");
    if (closer) closeModal(closer.dataset.closeModal);

    const toggle = event.target.closest("[data-toggle-password]");
    if (toggle) {
      const input = document.getElementById(toggle.dataset.togglePassword);
      input.type = input.type === "password" ? "text" : "password";
    }
  });

  $$(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal(modal.id);
    });
  });
}

async function loadPublicSettings() {
  try {
    const data = await api("/api/public-settings", { anonymous: true });
    state.appearance = normalizeAppearance(data);
    applyAppearance(state.appearance);
  } catch (error) {
    console.warn("Appearance settings:", error.message);
  }
}

function normalizeAppearance(value = {}) {
  const rawList = Array.isArray(value.backgroundUrls)
    ? value.backgroundUrls
    : String(value.backgroundUrl || "").split(/\n|,/).map(item => item.trim()).filter(Boolean);

  const backgroundUrls = [...new Set(rawList.filter(Boolean))].slice(0, 20);

  return {
    backgroundUrls,
    backgroundUrl: backgroundUrls[0] || "",
    overlay: Math.min(90, Math.max(20, Number(value.overlay ?? 58))),
    blur: Math.min(20, Math.max(0, Number(value.blur ?? 2))),
    slideSeconds: Math.min(60, Math.max(3, Number(value.slideSeconds ?? 8)))
  };
}

function applyAppearance(value) {
  const appearance = normalizeAppearance(value);
  state.appearance = appearance;

  document.documentElement.style.setProperty("--background-overlay", String(appearance.overlay / 100));
  document.documentElement.style.setProperty("--background-blur", `${appearance.blur}px`);

  renderBackgroundFrame();
  restartBackgroundRotation();
}

function renderBackgroundFrame() {
  const image = $("#siteBackground");
  const urls = state.appearance.backgroundUrls;

  if (!urls.length) {
    image.removeAttribute("src");
    image.classList.remove("active");
    return;
  }

  const url = urls[backgroundIndex % urls.length];
  image.classList.remove("active");
  image.onload = () => image.classList.add("active");
  image.onerror = () => image.classList.remove("active");
  image.src = url;
}

function restartBackgroundRotation() {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }

  const urls = state.appearance.backgroundUrls;
  if (urls.length <= 1) return;

  backgroundTimer = setInterval(() => {
    backgroundIndex = (backgroundIndex + 1) % urls.length;
    renderBackgroundFrame();
  }, state.appearance.slideSeconds * 1000);
}

async function restoreSession() {
  try {
    const data = await api("/api/session", { anonymous: true });
    if (data.authenticated) {
      state.user = data.user;
      state.menus = data.menus;
      showApp();
    } else {
      showLogin(data.setupReady);
    }
  } catch (error) {
    showLogin(false);
    showMessage("#loginMessage", error.message);
  }
}

async function login(event) {
  event.preventDefault();
  const button = $("#loginButton");
  setBusy(button, true, "Memeriksa...");

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: {
        username: $("#loginUsername").value.trim(),
        password: $("#loginPassword").value
      },
      anonymous: true
    });

    state.user = data.user;
    state.menus = data.menus;
    $("#loginForm").reset();
    hideMessage("#loginMessage");
    showApp();
    toast(`Selamat datang, ${state.user.username}.`, "ok");
  } catch (error) {
    showMessage("#loginMessage", error.message);
  } finally {
    setBusy(button, false);
  }
}

async function logout() {
  try {
    await api("/api/logout", { method: "POST" });
  } catch (_) {}
  state.user = null;
  state.menus = [];
  state.users = [];
  showLogin(true);
}

function showLogin(setupReady = true) {
  $("#appView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");

  if (!setupReady) {
    showMessage(
      "#loginMessage",
      "Akun master belum siap. Periksa binding DB serta MASTER_USERNAME dan MASTER_PASSWORD pada Cloudflare."
    );
  } else {
    hideMessage("#loginMessage");
  }
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  renderIdentity();
  renderMenu();

  const firstMenu = state.menus.find(menu => menu.id === state.currentMenu)
    || state.menus[0];

  if (firstMenu) navigate(firstMenu.id);
}

function renderIdentity() {
  const initial = escapeHtml(state.user.username.slice(0, 1).toUpperCase());
  const role = state.user.isMaster ? "Master Administrator" : "User";

  $("#sideUser").innerHTML = `
    <div class="user-summary">
      <span class="avatar">${initial}</span>
      <span class="user-text">
        <strong>${escapeHtml(state.user.username)}</strong>
        <small>${role}</small>
      </span>
    </div>`;

  $("#accountButton").innerHTML = `
    <span class="avatar">${initial}</span>
    <span>${escapeHtml(state.user.username)}</span>`;
}

function renderMenu() {
  $("#menuList").innerHTML = state.menus.map(menu => `
    <button class="menu-item" type="button" data-menu="${escapeHtml(menu.id)}">
      <span class="mi">${escapeHtml(menu.icon)}</span>
      <span>${escapeHtml(menu.label)}</span>
    </button>
  `).join("");

  $$(".menu-item").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.menu));
  });
}

async function navigate(menuId) {
  const menu = state.menus.find(item => item.id === menuId);
  if (!menu) return;

  state.currentMenu = menuId;
  $("#pageTitle").textContent = menu.label;
  $$(".menu-item").forEach(button => {
    button.classList.toggle("active", button.dataset.menu === menuId);
  });
  closeSidebar();

  if (menuId === "dashboard") return renderDashboard();
  if (menuId === "user-admin") return renderUserAdmin();
  if (menuId === "settings") return renderSettings();
  return renderModule(menu);
}

function renderDashboard() {
  const accessible = state.menus.filter(menu =>
    !["dashboard", "settings", "user-admin"].includes(menu.id)
  );

  $("#pageContent").innerHTML = `
    <section class="hero glass">
      <div>
        <span class="kicker">WELCOME BACK</span>
        <h1>Halo, ${escapeHtml(state.user.username)} 👋</h1>
        <p>Semua menu yang terlihat sudah mengikuti hak akses dari akun kamu. Background halaman dapat dibuat slideshow oleh master menggunakan beberapa link gambar.</p>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon">▦</span><span class="badge green">AKTIF</span></div>
        <strong>${accessible.length}</strong><small>Menu dapat diakses</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon">◉</span><span class="badge green">ONLINE</span></div>
        <strong>100%</strong><small>Status sistem</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon">◆</span><span class="badge purple">${state.user.isMaster ? "MASTER" : "USER"}</span></div>
        <strong>${state.user.isMaster ? "ALL" : "LIMIT"}</strong><small>Tingkat akses</small>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon">⌁</span><span class="badge green">AMAN</span></div>
        <strong>12h</strong><small>Masa sesi login</small>
      </article>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h3>Akses cepat</h3><p>Buka menu operasional dari dashboard.</p></div>
      </div>
      <div class="quick-grid">
        ${accessible.map(menu => `
          <button class="quick-card" type="button" data-quick="${escapeHtml(menu.id)}">
            <span class="qi">${escapeHtml(menu.icon)}</span>
            <span><strong>${escapeHtml(menu.label)}</strong><small>Buka modul →</small></span>
          </button>
        `).join("") || `<div class="content-card" style="padding:20px">Belum ada menu tambahan untuk akun ini.</div>`}
      </div>
    </section>`;

  $$("[data-quick]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.quick));
  });
}

async function renderModule(menu) {
  $("#pageContent").innerHTML = loadingHtml();

  try {
    const data = await api(`/api/module/${encodeURIComponent(menu.id)}`);
    $("#pageContent").innerHTML = `
      <section class="module-card glass">
        <header class="module-head">
          <div class="module-icon">${escapeHtml(menu.icon)}</div>
          <div>
            <span class="kicker">AUTHORIZED MODULE</span>
            <h3>${escapeHtml(menu.label)}</h3>
            <p>${escapeHtml(data.message)}</p>
          </div>
        </header>
        <div class="empty">
          <div>
            <div class="empty-icon">${escapeHtml(menu.icon)}</div>
            <h4>Menu ${escapeHtml(menu.label)} sudah aktif</h4>
            <p>Hak akses menu ini sudah diperiksa oleh server. Fitur asli menu dapat ditambahkan pada halaman ini.</p>
          </div>
        </div>
      </section>`;
  } catch (error) {
    $("#pageContent").innerHTML = errorHtml(error.message);
  }
}

async function renderUserAdmin() {
  $("#pageContent").innerHTML = loadingHtml();

  try {
    const data = await api("/api/users");
    state.users = data.users;

    $("#pageContent").innerHTML = `
      <section class="toolbar">
        <div>
          <span class="kicker">MASTER ACCESS</span>
          <h3>Manajemen pengguna</h3>
          <p>Buat akun dan tentukan hak akses menu masing-masing.</p>
        </div>
        <button id="addUserButton" class="btn btn-primary" type="button">＋ Tambah akun</button>
      </section>

      <div class="table-wrap glass">
        <table>
          <thead>
            <tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Akses menu</th><th>Dibuat</th><th>Aksi</th></tr>
          </thead>
          <tbody>${state.users.map(userRow).join("")}</tbody>
        </table>
      </div>`;

    $("#addUserButton").addEventListener("click", () => openUserForm());

    $$("[data-edit-user]").forEach(button => {
      button.addEventListener("click", () => {
        const user = state.users.find(item => String(item.id) === button.dataset.editUser);
        if (user) openUserForm(user);
      });
    });

    $$("[data-delete-user]").forEach(button => {
      button.addEventListener("click", () => {
        const user = state.users.find(item => String(item.id) === button.dataset.deleteUser);
        if (user) confirmDelete(user);
      });
    });
  } catch (error) {
    $("#pageContent").innerHTML = errorHtml(error.message);
  }
}

function userRow(user) {
  const labels = user.isMaster
    ? ["Semua menu"]
    : user.permissions.map(id => state.menus.find(menu => menu.id === id)?.label || id);

  return `
    <tr>
      <td><div class="table-user"><span class="avatar">${escapeHtml(user.username[0].toUpperCase())}</span><strong>${escapeHtml(user.username)}</strong></div></td>
      <td><span class="badge ${user.isMaster ? "purple" : ""}">${user.isMaster ? "Master" : "User"}</span></td>
      <td><span class="badge ${user.active ? "green" : "red"}">${user.active ? "Aktif" : "Nonaktif"}</span></td>
      <td><div class="chips">${(labels.length ? labels : ["Tanpa akses"]).map(label =>
        `<span class="chip">${escapeHtml(label)}</span>`).join("")}</div></td>
      <td>${escapeHtml(formatDate(user.createdAt))}</td>
      <td>${user.isMaster ? `<span class="muted">Terkunci</span>` : `
        <div class="row-actions">
          <button class="row-btn" type="button" data-edit-user="${user.id}" title="Edit">✎</button>
          <button class="row-btn danger" type="button" data-delete-user="${user.id}" title="Hapus">⌫</button>
        </div>`}</td>
    </tr>`;
}

function openUserForm(user = null) {
  $("#userForm").reset();
  $("#editUserId").value = user?.id || "";
  $("#userModalTitle").textContent = user ? "Edit akun" : "Tambah akun";
  $("#passwordHint").textContent = user ? "(kosongkan bila tidak diganti)" : "";
  $("#userUsername").value = user?.username || "";
  $("#userPassword").required = !user;
  $("#userActive").checked = user ? user.active : true;
  hideMessage("#userMessage");

  const assignableMenus = state.menus.filter(menu =>
    !["dashboard", "settings", "user-admin"].includes(menu.id)
  );

  $("#permissionGrid").innerHTML = assignableMenus.map(menu => `
    <label class="permission-option">
      <input class="permission-check" type="checkbox" value="${escapeHtml(menu.id)}"
             ${user?.permissions.includes(menu.id) ? "checked" : ""}>
      <span class="pi">${escapeHtml(menu.icon)}</span>
      <strong>${escapeHtml(menu.label)}</strong>
    </label>
  `).join("");

  openModal("userModal");
}

async function saveUser(event) {
  event.preventDefault();
  const id = $("#editUserId").value;
  const button = $("#saveUserButton");

  setBusy(button, true, "Menyimpan...");
  hideMessage("#userMessage");

  try {
    await api(id ? `/api/users/${id}` : "/api/users", {
      method: id ? "PUT" : "POST",
      body: {
        username: $("#userUsername").value.trim(),
        password: $("#userPassword").value,
        active: $("#userActive").checked,
        permissions: $$(".permission-check:checked").map(input => input.value)
      }
    });

    closeModal("userModal");
    toast(id ? "Akun berhasil diperbarui." : "Akun berhasil dibuat.", "ok");
    await renderUserAdmin();
  } catch (error) {
    showMessage("#userMessage", error.message);
  } finally {
    setBusy(button, false);
  }
}

function confirmDelete(user) {
  $("#confirmTitle").textContent = `Hapus ${user.username}?`;
  $("#confirmText").textContent = "Akun dan seluruh sesi loginnya akan dihapus.";
  state.pendingConfirm = async () => {
    try {
      await api(`/api/users/${user.id}`, { method: "DELETE" });
      toast("Akun berhasil dihapus.", "ok");
      await renderUserAdmin();
    } catch (error) {
      toast(error.message, "bad");
    }
  };
  openModal("confirmModal");
}

async function renderSettings() {
  $("#pageContent").innerHTML = loadingHtml();

  try {
    const data = await api("/api/settings/background");
    state.appearance = normalizeAppearance(data);

    $("#pageContent").innerHTML = `
      <section class="settings-grid">
        <article class="setting-card">
          <span class="eyebrow">LIQUID GLASS APPEARANCE</span>
          <h3>Multi background slideshow</h3>
          <p>Tempel banyak link gambar sekaligus. Satu link per baris. Semua gambar akan dipakai sebagai slideshow untuk halaman login dan seluruh halaman dalam.</p>
          <form id="backgroundForm">
            <label>Daftar link gambar HTTPS <small class="subtext">Satu link per baris • maksimal 20 link</small>
              <textarea id="backgroundLinks" placeholder="https://domain.com/1.jpg&#10;https://domain.com/2.jpg&#10;https://domain.com/3.jpg">${escapeHtml(state.appearance.backgroundUrls.join("\n"))}</textarea>
            </label>
            <div class="range-group">
              <div class="range-row"><header><strong>Kegelapan overlay</strong><span id="overlayValue">${state.appearance.overlay}%</span></header><input id="overlayInput" type="range" min="20" max="90" step="1" value="${state.appearance.overlay}"></div>
              <div class="range-row"><header><strong>Blur background</strong><span id="blurValue">${state.appearance.blur}px</span></header><input id="blurInput" type="range" min="0" max="20" step="1" value="${state.appearance.blur}"></div>
              <div class="range-row"><header><strong>Kecepatan slideshow</strong><span id="slideValue">${state.appearance.slideSeconds} detik</span></header><input id="slideInput" type="range" min="3" max="60" step="1" value="${state.appearance.slideSeconds}"></div>
            </div>
            <div class="setting-actions">
              <button id="previewBackground" class="btn btn-secondary" type="button">Preview sekarang</button>
              <button id="saveBackground" class="btn btn-primary" type="submit">Simpan untuk semua akun</button>
              <button id="resetBackground" class="btn btn-ghost" type="button">Kembali ke bawaan</button>
            </div>
            <div id="backgroundMessage" class="message hidden"></div>
          </form>
        </article>
        <article class="setting-card">
          <span class="eyebrow">LIVE PREVIEW</span>
          <h3>Preview liquid glass</h3>
          <p>Preview menggunakan gambar pertama dari daftar link. Setelah disimpan, seluruh gambar akan berganti otomatis sesuai interval slideshow.</p>
          <div id="backgroundPreviewBox" class="preview-box" style="--preview-overlay:${state.appearance.overlay / 100};--preview-blur:${state.appearance.blur}px">
            <img id="backgroundPreview" alt="Preview background" referrerpolicy="no-referrer" ${state.appearance.backgroundUrls[0] ? `src="${escapeAttribute(state.appearance.backgroundUrls[0])}"` : ""}>
            <span class="preview-badge" id="previewCount">${state.appearance.backgroundUrls.length} gambar</span>
            <div class="preview-center"><strong id="previewLabel">${state.appearance.backgroundUrls.length ? "Preview aktif" : "Belum ada gambar"}</strong><small id="previewSubtext">${state.appearance.backgroundUrls.length ? `${state.appearance.slideSeconds} detik per slide` : "Menggunakan background bawaan"}</small></div>
          </div>
          <div class="help-list">
            <div class="help-item"><b>1</b><div><strong>Gunakan link langsung</strong><small>Link harus langsung membuka file gambar, bukan halaman website biasa.</small></div></div>
            <div class="help-item"><b>2</b><div><strong>Bisa banyak gambar</strong><small>Masukkan beberapa link sekaligus. Sistem akan memutar slideshow otomatis.</small></div></div>
            <div class="help-item"><b>3</b><div><strong>Berlaku untuk semua</strong><small>Login page dan halaman dashboard seluruh akun ikut menggunakan tampilan ini.</small></div></div>
          </div>
        </article>
      </section>`;

    $("#previewBackground").addEventListener("click", previewAppearance);
    $("#backgroundForm").addEventListener("submit", saveAppearance);
    $("#resetBackground").addEventListener("click", resetAppearance);
    $("#overlayInput").addEventListener("input", updatePreviewControls);
    $("#blurInput").addEventListener("input", updatePreviewControls);
    $("#slideInput").addEventListener("input", updatePreviewControls);
    $("#backgroundLinks").addEventListener("input", updatePreviewControls);
  } catch (error) {
    $("#pageContent").innerHTML = errorHtml(error.message);
  }
}

function parseBackgroundLinks(text) {
  return [...new Set(String(text || "").split(/\n|,/).map(item => item.trim()).filter(Boolean))].slice(0, 20);
}

function appearanceFromForm() {
  const backgroundUrls = parseBackgroundLinks($("#backgroundLinks").value);
  return normalizeAppearance({
    backgroundUrls,
    overlay: Number($("#overlayInput").value),
    blur: Number($("#blurInput").value),
    slideSeconds: Number($("#slideInput").value)
  });
}

function updatePreviewControls() {
  const appearance = appearanceFromForm();
  $("#overlayValue").textContent = `${appearance.overlay}%`;
  $("#blurValue").textContent = `${appearance.blur}px`;
  $("#slideValue").textContent = `${appearance.slideSeconds} detik`;
  $("#backgroundPreviewBox").style.setProperty("--preview-overlay", String(appearance.overlay / 100));
  $("#backgroundPreviewBox").style.setProperty("--preview-blur", `${appearance.blur}px`);
  $("#previewCount").textContent = `${appearance.backgroundUrls.length} gambar`;
  $("#previewSubtext").textContent = appearance.backgroundUrls.length ? `${appearance.slideSeconds} detik per slide` : "Menggunakan background bawaan";
}

function validateAppearance(value) {
  for (const url of value.backgroundUrls) {
    let parsed;
    try { parsed = new URL(url); } catch (_) { throw new Error(`Link background tidak valid: ${url}`); }
    if (parsed.protocol !== "https:") throw new Error(`Link wajib HTTPS: ${url}`);
  }
}

function previewAppearance() {
  try {
    const appearance = appearanceFromForm();
    validateAppearance(appearance);
    const preview = $("#backgroundPreview");
    const first = appearance.backgroundUrls[0] || "";
    if (!first) {
      preview.removeAttribute("src");
      $("#previewLabel").textContent = "Belum ada gambar";
      $("#previewSubtext").textContent = "Menggunakan background bawaan";
      hideMessage("#backgroundMessage");
      backgroundIndex = 0;
      applyAppearance(appearance);
      return;
    }
    preview.onerror = () => { showMessage("#backgroundMessage", "Salah satu preview gagal dimuat. Gunakan link gambar langsung dari hosting yang mengizinkan hotlink."); $("#previewLabel").textContent = "Preview gagal"; };
    preview.onload = () => { hideMessage("#backgroundMessage"); $("#previewLabel").textContent = "Preview aktif"; };
    preview.src = first;
    backgroundIndex = 0;
    applyAppearance(appearance);
  } catch (error) {
    showMessage("#backgroundMessage", error.message);
  }
}

async function saveAppearance(event) {
  event.preventDefault();
  const button = $("#saveBackground");
  setBusy(button, true, "Menyimpan...");
  try {
    const appearance = appearanceFromForm();
    validateAppearance(appearance);
    const data = await api("/api/settings/background", { method: "PUT", body: appearance });
    state.appearance = normalizeAppearance(data);
    backgroundIndex = 0;
    applyAppearance(state.appearance);
    showMessage("#backgroundMessage", "Tampilan liquid glass dan slideshow background berhasil disimpan.", true);
    toast("Background slideshow berhasil diperbarui.", "ok");
    updatePreviewControls();
  } catch (error) {
    showMessage("#backgroundMessage", error.message);
  } finally {
    setBusy(button, false);
  }
}

async function resetAppearance() {
  try {
    const data = await api("/api/settings/background", { method: "PUT", body: { backgroundUrls: [], overlay: 58, blur: 2, slideSeconds: 8 } });
    state.appearance = normalizeAppearance(data);
    backgroundIndex = 0;
    $("#backgroundLinks").value = "";
    $("#overlayInput").value = String(state.appearance.overlay);
    $("#blurInput").value = String(state.appearance.blur);
    $("#slideInput").value = String(state.appearance.slideSeconds);
    $("#backgroundPreview").removeAttribute("src");
    $("#previewLabel").textContent = "Belum ada gambar";
    updatePreviewControls();
    applyAppearance(state.appearance);
    showMessage("#backgroundMessage", "Tampilan dikembalikan ke bawaan sistem.", true);
  } catch (error) {
    showMessage("#backgroundMessage", error.message);
  }
}

async function changePassword(event) {
  event.preventDefault();
  const newPassword = $("#newPassword").value;

  hideMessage("#passwordMessage");
  if (newPassword !== $("#confirmPassword").value) {
    showMessage("#passwordMessage", "Konfirmasi password baru tidak sama.");
    return;
  }

  try {
    await api("/api/change-password", {
      method: "POST",
      body: {
        currentPassword: $("#currentPassword").value,
        newPassword
      }
    });
    $("#passwordForm").reset();
    closeModal("passwordModal");
    toast("Password berhasil diubah.", "ok");
  } catch (error) {
    showMessage("#passwordMessage", error.message);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      const shortText = rawText.replace(/\s+/g, " ").slice(0, 160);
      data = {
        error: `API tidak mengirim JSON (HTTP ${response.status}). ${shortText || "Periksa deployment Functions."}`
      };
    }
  }

  if (response.status === 401 && !options.anonymous) {
    state.user = null;
    showLogin(true);
  }

  if (!response.ok) {
    throw new Error(data.error || `Terjadi kesalahan pada API (HTTP ${response.status}).`);
  }

  return data;
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
  if ($$(".modal:not(.hidden)").length === 0) document.body.style.overflow = "";
}

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.remove("hidden");
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.add("hidden");
}

function setBusy(button, busy, text = "") {
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }
}

function showMessage(selector, text, success = false) {
  const element = $(selector);
  element.textContent = text;
  element.classList.remove("hidden");
  element.classList.toggle("success", success);
}

function hideMessage(selector) {
  const element = $(selector);
  element.textContent = "";
  element.classList.add("hidden");
  element.classList.remove("success");
}

function toast(text, type = "ok") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = text;
  $("#toastArea").appendChild(item);
  setTimeout(() => item.remove(), 3500);
}

function loadingHtml() {
  return `<div class="loading"><div><div class="spinner"></div>Memuat data...</div></div>`;
}

function errorHtml(message) {
  return `<section class="module-card glass"><div class="empty"><div>
    <div class="empty-icon">⚠</div><h4>Gagal membuka halaman</h4><p>${escapeHtml(message)}</p>
  </div></div></section>`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
