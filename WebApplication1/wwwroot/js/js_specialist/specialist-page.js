let specialistOrders = [];
let specialistAllOrders = [];
let openedOrderId = null;
let focusedOrderId = null;

let activeSpecialistTab = "orders";

function setPageStatus(text, isError = false) {
  const el = document.getElementById("pageStatus");

  if (!el) return;

  el.textContent = text || "";
  el.className = isError ? "status-text error" : "status-text";
}

function updateWorkspaceChrome() {
  const card = document.querySelector(".specialist-card");
  const backBtn = document.getElementById("backToOrdersTopBtn");

  const isFocusMode = Boolean(focusedOrderId);

  if (card) {
    card.classList.toggle("single-order-mode", isFocusMode);
  }

  if (backBtn) {
    backBtn.hidden = !isFocusMode;
    backBtn.classList.toggle("is-hidden", !isFocusMode);
  }
}

function getStatusFilterValue() {
  const filter = document.getElementById("statusFilter");
  return filter?.value || "";
}

function getSpecialistOrderId(order) {
  if (typeof getOrderId === "function") {
    return getOrderId(order);
  }

  return order?.id || order?._id || "";
}

function updateOrderInCaches(order) {
  if (!order) return;

  const orderId = getSpecialistOrderId(order);
  if (!orderId) return;

  function upsert(list) {
    const currentList = Array.isArray(list) ? list : [];
    const index = currentList.findIndex(item => getSpecialistOrderId(item) === orderId);

    if (index >= 0) {
      currentList[index] = order;
      return currentList;
    }

    return [order, ...currentList];
  }

  specialistOrders = upsert(specialistOrders);
  specialistAllOrders = upsert(specialistAllOrders);
}

async function fetchSpecialistOrdersSafe(status = "") {
  if (typeof fetchSpecialistOrders === "function") {
    return await fetchSpecialistOrders(status);
  }

  if (typeof fetchMySpecialistOrders === "function") {
    return await fetchMySpecialistOrders(status);
  }

  if (typeof fetchMyOrders === "function") {
    return await fetchMyOrders(status);
  }

  if (typeof apiFetch === "function") {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return await apiFetch(`/api/specialist/orders${query}`);
  }

  const token = localStorage.getItem("token");
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  const response = await fetch(`/api/specialist/orders${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Не вдалося завантажити заявки");
  }

  return await response.json();
}

async function fetchSpecialistOrderByIdSafe(orderId) {
  if (typeof fetchSpecialistOrderById === "function") {
    return await fetchSpecialistOrderById(orderId);
  }

  if (typeof fetchSpecialistOrder === "function") {
    return await fetchSpecialistOrder(orderId);
  }

  if (typeof apiFetch === "function") {
    return await apiFetch(`/api/specialist/orders/${encodeURIComponent(orderId)}`);
  }

  const token = localStorage.getItem("token");

  const response = await fetch(`/api/specialist/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Не вдалося завантажити заявку");
  }

  return await response.json();
}

async function loadOrders(options = {}) {
  const {
    render = true,
    statusOverride = null,
    silent = false,
    updateAllCache = false
  } = options;

  const status = statusOverride !== null
    ? statusOverride
    : getStatusFilterValue();

  try {
    if (!silent) {
      setPageStatus("Завантаження заявок...");
    }

    const data = await fetchSpecialistOrdersSafe(status);
    const orders = Array.isArray(data) ? data : [];

    specialistOrders = orders;

    if (!status || updateAllCache || statusOverride === "") {
      specialistAllOrders = orders;
    }

    if (render && activeSpecialistTab === "orders") {
      renderOrders(specialistOrders);
    }

    if (!silent) {
      setPageStatus(`Завантажено ${orders.length} заявок`);
    }

    return orders;
  } catch (e) {
    console.error(e);

    if (render && activeSpecialistTab === "orders") {
      const container = document.getElementById("orders");

      if (container) {
        const msg = typeof escapeHtml === "function"
          ? escapeHtml(e.message || "Помилка завантаження")
          : String(e.message || "Помилка завантаження");

        container.innerHTML = `<div class="error-box">${msg}</div>`;
      }
    }

    if (!silent) {
      setPageStatus("Помилка завантаження заявок: " + e.message, true);
    }

    return [];
  }
}

async function ensureSpecialistAllOrdersLoaded(force = false) {
  if (!force && Array.isArray(specialistAllOrders) && specialistAllOrders.length > 0) {
    return specialistAllOrders;
  }

  return await loadOrders({
    render: false,
    statusOverride: "",
    silent: true,
    updateAllCache: true
  });
}

async function refreshFocusedOrder(orderId) {
  try {
    const order = await fetchSpecialistOrderByIdSafe(orderId);
    updateOrderInCaches(order);

    if (focusedOrderId) {
      focusedOrderId = String(orderId);
      openedOrderId = String(orderId);
    }

    if (activeSpecialistTab === "orders") {
      renderOrders(specialistOrders);
    }

    return order;
  } catch (e) {
    console.error(e);

    await loadOrders({
      render: activeSpecialistTab === "orders",
      statusOverride: getStatusFilterValue(),
      silent: true
    });

    if (activeSpecialistTab === "orders") {
      renderOrders(specialistOrders);
    }

    return null;
  }
}

function toggleDetails(orderId) {
  if (!orderId) return;

  const id = String(orderId);

  openedOrderId = openedOrderId === id ? null : id;
  renderOrders(specialistOrders);
}

async function openOrderWorkspace(orderId) {
  if (!orderId) return;

  focusedOrderId = String(orderId);
  openedOrderId = String(orderId);

  await switchSpecialistTab("orders", false);

  const order = await refreshFocusedOrder(orderId);

  if (!order) {
    renderOrders(specialistOrders);
  }

  updateWorkspaceChrome();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function closeOrderWorkspace() {
  focusedOrderId = null;
  openedOrderId = null;

  updateWorkspaceChrome();

  if (activeSpecialistTab !== "orders") {
    await switchSpecialistTab("orders", false);
  }

  await loadOrders({
    render: true,
    statusOverride: getStatusFilterValue(),
    silent: true
  });
}

async function handleRefresh() {
  if (activeSpecialistTab === "orders") {
    if (focusedOrderId) {
      await refreshFocusedOrder(focusedOrderId);
      return;
    }

    await loadOrders();
    return;
  }

  if (activeSpecialistTab === "analytics") {
    await ensureSpecialistAllOrdersLoaded(true);

    if (typeof loadSpecialistAnalytics === "function") {
      await loadSpecialistAnalytics();
    }

    return;
  }

  if (activeSpecialistTab === "details") {
    await ensureSpecialistAllOrdersLoaded(true);

    if (typeof renderSpecialistDetailRequestsTab === "function") {
      renderSpecialistDetailRequestsTab();
    }

    return;
  }

  if (activeSpecialistTab === "reworks") {
    await ensureSpecialistAllOrdersLoaded(true);

    if (typeof renderSpecialistReworksTab === "function") {
      renderSpecialistReworksTab();
    }
  }
}

function initSpecialistTabs() {
  const buttons = document.querySelectorAll("[data-specialist-tab]");

  buttons.forEach(button => {
    button.addEventListener("click", async () => {
      const tab = button.dataset.specialistTab;
      await switchSpecialistTab(tab);
    });
  });
}

async function switchSpecialistTab(tab, shouldLoad = true) {
  const targetTab = tab || "orders";
  activeSpecialistTab = targetTab;

  document.querySelectorAll("[data-specialist-tab]").forEach(button => {
    const isActive = button.dataset.specialistTab === targetTab;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-specialist-panel]").forEach(panel => {
    panel.hidden = panel.dataset.specialistPanel !== targetTab;
  });

  if (targetTab !== "orders") {
    focusedOrderId = null;
    openedOrderId = null;
    updateWorkspaceChrome();
  }

  if (targetTab === "orders") {
    if (shouldLoad) {
      await loadOrders();
    } else {
      renderOrders(specialistOrders);
    }

    return;
  }

  if (targetTab === "analytics") {
    await ensureSpecialistAllOrdersLoaded();

    if (typeof initSpecialistAnalyticsFilters === "function") {
      initSpecialistAnalyticsFilters();
    }

    if (shouldLoad && typeof loadSpecialistAnalytics === "function") {
      await loadSpecialistAnalytics();
    }

    return;
  }

  if (targetTab === "details") {
    await ensureSpecialistAllOrdersLoaded();

    if (typeof renderSpecialistDetailRequestsTab === "function") {
      renderSpecialistDetailRequestsTab();
    }

    return;
  }

  if (targetTab === "reworks") {
    await ensureSpecialistAllOrdersLoaded();

    if (typeof renderSpecialistReworksTab === "function") {
      renderSpecialistReworksTab();
    }
  }
}

async function loadHeaderUser() {
  const nameEl = document.getElementById("headerUserName");
  const roleEl = document.querySelector(".app-user-role");
  const helloEl = document.getElementById("hello");

  try {
    let user = null;

    if (typeof getCurrentUser === "function") {
      user = await getCurrentUser();
    } else if (typeof apiFetch === "function") {
      user = await apiFetch("/api/auth/me");
    } else {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Token not found");
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Не вдалося отримати дані користувача");
      }

      user = await response.json();
    }

    const fullName =
      user?.fullName ||
      user?.full_name ||
      user?.name ||
      user?.login ||
      "Спеціаліст";

    if (nameEl) {
      nameEl.textContent = fullName;
    }

    if (roleEl) {
      roleEl.textContent = "Спеціаліст";
    }

    if (helloEl && activeSpecialistTab === "orders") {
      helloEl.textContent = "Заявки спеціаліста";
    }
  } catch (e) {
    console.warn("Header user load failed:", e);

    if (nameEl) {
      nameEl.textContent = "Спеціаліст";
    }

    if (roleEl) {
      roleEl.textContent = "Спеціаліст";
    }
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");

  window.location.href = "/";
}

window.logout = logout;

window.loadHeaderUser = loadHeaderUser;
window.handleRefresh = handleRefresh;
window.openOrderWorkspace = openOrderWorkspace;
window.closeOrderWorkspace = closeOrderWorkspace;
window.toggleDetails = toggleDetails;

window.addEventListener("DOMContentLoaded", async () => {
  initSpecialistTabs();

  const filter = document.getElementById("statusFilter");

  if (filter) {
    filter.addEventListener("change", async () => {
      focusedOrderId = null;
      openedOrderId = null;

      await loadOrders({
        render: activeSpecialistTab === "orders",
        statusOverride: getStatusFilterValue()
      });
    });
  }

  await loadHeaderUser();

  if (typeof initSpecialistAnalyticsFilters === "function") {
    initSpecialistAnalyticsFilters();
  }

  await switchSpecialistTab("orders", true);

  await ensureSpecialistAllOrdersLoaded();
});