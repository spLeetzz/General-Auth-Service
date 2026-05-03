/* ── General Auth Service _ Dashboard App ─────────────── */
(function () {
  "use strict";

  // ── Helpers ──────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function showAlert(el, type, msg) {
    el.className = `alert alert-${type} show`;
    el.textContent = msg;
  }
  function hideAlert(el) {
    el.className = "alert";
    el.textContent = "";
  }
  function setLoading(btn, loading) {
    if (loading) {
      btn.dataset.origText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.origText || "Submit";
    }
  }

  async function api(method, path, body) {
    const opts = {
      method,
      headers: {},
      credentials: "same-origin",
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        data?.error?.message || data?.message || data?.error || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function initials(first, last) {
    return ((first?.[0] || "") + (last?.[0] || "")).toUpperCase() || "?";
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      /* fallback */
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    });
  }

  // ── State ────────────────────────────────────────────
  let currentUser = null;
  let clientsCache = [];

  // ── Navigation ───────────────────────────────────────
  function navigate() {
    const hash = location.hash.replace("#", "") || "profile";
    $$(".page-section").forEach((s) => s.classList.remove("active"));
    const target = $(`#page-${hash}`);
    if (target) target.classList.add("active");

    $$(".sidebar-nav a").forEach((a) => {
      a.classList.toggle("active", a.dataset.page === hash);
    });

    // close mobile sidebar
    $("#sidebar").classList.remove("open");

    // load data for the page
    if (hash === "clients" && clientsCache.length === 0) loadClients();
  }

  $$(".sidebar-nav a").forEach((a) =>
    a.addEventListener("click", () => {
      setTimeout(navigate, 0);
    })
  );
  window.addEventListener("hashchange", navigate);

  // Mobile menu
  $("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  // ── Bootstrap ────────────────────────────────────────
  async function bootstrap() {
    try {
      currentUser = await api("GET", "/api/me");
      renderProfile();
      renderSidebar();
      renderSecurityPage();
      $("#loadingState").style.display = "none";
      navigate();
    } catch {
      // Not authenticated → redirect to login
      window.location.href = "/authorize/login";
    }
  }

  // ── Render: Sidebar ──────────────────────────────────
  function renderSidebar() {
    if (!currentUser) return;
    const u = currentUser;
    const ini = initials(u.firstName, u.lastName);
    $("#sidebarName").textContent =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
    $("#sidebarEmail").textContent = u.email;
    const avatarEl = $("#sidebarAvatar");
    if (u.avatarUrl) {
      avatarEl.innerHTML = `<img src="${u.avatarUrl}" alt="avatar">`;
    } else {
      avatarEl.textContent = ini;
    }
  }

  // ── Render: Profile ──────────────────────────────────
  function renderProfile() {
    if (!currentUser) return;
    const u = currentUser;
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
    const ini = initials(u.firstName, u.lastName);

    $("#profileName").textContent = name;
    $("#profileEmail").textContent = u.email;

    const avatarEl = $("#profileAvatar");
    if (u.avatarUrl) {
      avatarEl.innerHTML = `<img src="${u.avatarUrl}" alt="avatar">`;
    } else {
      avatarEl.textContent = ini;
    }

    // SSO badges in profile card
    const provBox = $("#profileProviders");
    if (u.ssoProviders && u.ssoProviders.length > 0) {
      provBox.innerHTML = u.ssoProviders
        .map(
          (p) =>
            `<span class="badge badge-green" style="margin-right:.3rem">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="20 6 9 17 4 12"/></svg>
              ${p}
            </span>`
        )
        .join("");
    } else {
      provBox.innerHTML = "";
    }

    // Pre-fill email form
    $("#newEmail").value = u.email;
  }

  // ── Render: Security Page ────────────────────────────
  function renderSecurityPage() {
    if (!currentUser) return;
    const u = currentUser;

    if (!u.hasPassword) {
      $("#passwordInfo").innerHTML =
        'You signed up via SSO and have <span class="badge badge-yellow">no password</span> set. You can set one below.';
      $("#currentPasswordField").style.display = "none";
    } else {
      $("#passwordInfo").textContent = "Update your password below.";
      $("#currentPasswordField").style.display = "";
    }

    // SSO list
    const container = $("#ssoProvidersList");
    if (u.ssoProviders && u.ssoProviders.length > 0) {
      container.innerHTML = u.ssoProviders
        .map(
          (p) =>
            `<div style="display:flex;align-items:center;gap:.6rem;padding:.6rem 0;border-bottom:1px solid var(--border)">
              <span class="badge badge-green">${p}</span>
              <span style="font-size:.88rem;color:var(--text-dim)">Linked</span>
            </div>`
        )
        .join("");
    } else {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:.88rem">No SSO providers linked. <a href="/authorize/google" style="color:var(--accent)">Link Google</a></p>`;
    }
  }

  // ── Form: Update Email ───────────────────────────────
  $("#emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = $("#emailAlert");
    hideAlert(alert);
    const btn = $("#emailSubmit");
    const email = $("#newEmail").value.trim();
    const currentPassword = $("#emailPassword").value;

    if (!email) return showAlert(alert, "error", "Email is required.");

    setLoading(btn, true);
    try {
      await api("PATCH", "/api/me/email", { email, currentPassword });
      showAlert(alert, "success", "Email updated successfully.");
      currentUser.email = email;
      renderSidebar();
      renderProfile();
      $("#emailPassword").value = "";
    } catch (err) {
      showAlert(alert, "error", err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── Form: Update Password ───────────────────────────
  $("#passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = $("#passwordAlert");
    hideAlert(alert);
    const btn = $("#passwordSubmit");
    const newPassword = $("#newPassword").value;
    const confirmPassword = $("#confirmPassword").value;
    const currentPassword = $("#currentPassword").value;

    if (newPassword !== confirmPassword) {
      return showAlert(alert, "error", "Passwords do not match.");
    }

    const body = { newPassword };
    if (currentPassword) body.currentPassword = currentPassword;

    setLoading(btn, true);
    try {
      await api("PATCH", "/api/me/password", body);
      showAlert(alert, "success", "Password updated successfully.");
      currentUser.hasPassword = true;
      renderSecurityPage();
      $("#newPassword").value = "";
      $("#confirmPassword").value = "";
      $("#currentPassword").value = "";
    } catch (err) {
      showAlert(alert, "error", err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── Logout ───────────────────────────────────────────
  $("#btnLogout").addEventListener("click", async () => {
    try {
      await fetch("/authorize/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* ignore */
    }
    window.location.href = "/authorize/login";
  });

  // ── Clients: Load ────────────────────────────────────
  async function loadClients() {
    try {
      clientsCache = await api("GET", "/api/me/clients");
      renderClients();
    } catch (err) {
      const box = $("#clientsList");
      box.innerHTML = `<div class="alert alert-error show">${err.message}</div>`;
    }
  }

  // ── Clients: Render ──────────────────────────────────
  function renderClients() {
    const box = $("#clientsList");
    if (!clientsCache.length) {
      box.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <h3>No clients yet</h3>
          <p>Create your first OAuth client to get started.</p>
        </div>`;
      return;
    }

    box.innerHTML = clientsCache
      .map(
        (c) => `
      <div class="client-card" data-client-id="${c.id}">
        <div class="client-header">
          <div>
            <div class="client-name">${esc(c.name)}</div>
            <div class="client-id">ID: ${c.id}</div>
          </div>
          <div style="display:flex;gap:.4rem">
            <button class="btn btn-sm btn-secondary btn-add-uri" data-id="${c.id}" title="Add redirect URI">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              URI
            </button>
            <button class="btn btn-sm btn-danger btn-rotate" data-id="${c.id}" data-name="${esc(c.name)}" title="Rotate secret">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Rotate
            </button>
          </div>
        </div>
        <div class="client-meta">
          ${c.pkceRequired ? '<span class="badge badge-blue">PKCE</span>' : '<span class="badge badge-yellow">No PKCE</span>'}
          <span class="badge badge-green">${(c.redirectUris || []).length} URI${(c.redirectUris || []).length !== 1 ? "s" : ""}</span>
        </div>
        <ul class="uri-list">
          ${(c.redirectUris || [])
            .map(
              (uri) =>
                `<li>
                  <span>${esc(uri)}</span>
                  <button class="btn-remove-uri" data-id="${c.id}" data-uri="${esc(uri)}" title="Remove URI">✕</button>
                </li>`
            )
            .join("")}
        </ul>
      </div>`
      )
      .join("");

    // Wire up buttons
    box.querySelectorAll(".btn-rotate").forEach((btn) =>
      btn.addEventListener("click", () =>
        rotateSecret(btn.dataset.id, btn.dataset.name)
      )
    );
    box.querySelectorAll(".btn-add-uri").forEach((btn) =>
      btn.addEventListener("click", () => openAddUriModal(btn.dataset.id))
    );
    box.querySelectorAll(".btn-remove-uri").forEach((btn) =>
      btn.addEventListener("click", () =>
        removeUri(btn.dataset.id, btn.dataset.uri)
      )
    );
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Clients: Create ──────────────────────────────────
  $("#btnNewClient").addEventListener("click", () => {
    $("#createClientModal").classList.add("show");
    hideAlert($("#createClientAlert"));
    $("#createClientForm").reset();
    $("#clientPkce").checked = true;
  });
  $("#cancelCreateClient").addEventListener("click", () => {
    $("#createClientModal").classList.remove("show");
  });
  $("#createClientModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget)
      $("#createClientModal").classList.remove("show");
  });

  $("#createClientForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = $("#createClientAlert");
    hideAlert(alert);
    const btn = $("#createClientSubmit");
    const name = $("#clientName").value.trim();
    const redirectUri = $("#clientRedirectUri").value.trim();
    const pkceRequired = $("#clientPkce").checked;

    if (!name || !redirectUri)
      return showAlert(alert, "error", "All fields are required.");

    setLoading(btn, true);
    try {
      const data = await api("POST", "/api/me/clients", {
        name,
        redirectUris: [redirectUri],
        pkceRequired,
      });
      // Show secret
      showNewSecret(data.client_secret);
      // Close modal & refresh
      $("#createClientModal").classList.remove("show");
      await loadClients();
    } catch (err) {
      showAlert(alert, "error", err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // ── Clients: Rotate Secret ───────────────────────────
  async function rotateSecret(clientId, clientName) {
    if (
      !confirm(
        `Rotate secret for "${clientName}"?\n\nThe old secret will stop working immediately.`
      )
    )
      return;

    try {
      const data = await api(
        "PATCH",
        `/api/me/clients/${clientId}/rotate-secret`
      );
      showNewSecret(data.client_secret);
    } catch (err) {
      alert("Error rotating secret: " + err.message);
    }
  }

  function showNewSecret(secret) {
    const alertEl = $("#newSecretAlert");
    const box = $("#newSecretBox");
    const val = $("#newSecretValue");

    alertEl.style.display = "flex";
    box.style.display = "block";
    val.textContent = secret;

    // auto-scroll to top of clients page
    $("#page-clients").scrollIntoView({ behavior: "smooth" });
  }

  $("#copySecretBtn").addEventListener("click", () => {
    copyToClipboard($("#newSecretValue").textContent);
    $("#copySecretBtn").textContent = "Copied!";
    setTimeout(() => ($("#copySecretBtn").textContent = "Copy"), 2000);
  });

  // ── Clients: Add URI ─────────────────────────────────
  function openAddUriModal(clientId) {
    $("#addUriClientId").value = clientId;
    $("#addUriModal").classList.add("show");
    hideAlert($("#addUriAlert"));
    $("#addUriForm").reset();
    $("#addUriClientId").value = clientId;
  }

  $("#addUriForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = $("#addUriAlert");
    hideAlert(alert);
    const clientId = $("#addUriClientId").value;
    const uri = $("#newUriInput").value.trim();
    if (!uri) return showAlert(alert, "error", "URI is required.");

    try {
      await api("PUT", `/api/me/clients/${clientId}/redirect-uris`, {
        urisToAdd: [uri],
        urisToRemove: [],
      });
      $("#addUriModal").classList.remove("show");
      await loadClients();
    } catch (err) {
      showAlert(alert, "error", err.message);
    }
  });

  // ── Clients: Remove URI ──────────────────────────────
  async function removeUri(clientId, uri) {
    if (!confirm(`Remove redirect URI?\n\n${uri}`)) return;
    try {
      await api("PUT", `/api/me/clients/${clientId}/redirect-uris`, {
        urisToAdd: [],
        urisToRemove: [uri],
      });
      await loadClients();
    } catch (err) {
      alert("Error removing URI: " + err.message);
    }
  }

  // ── Go ───────────────────────────────────────────────
  bootstrap();
})();
