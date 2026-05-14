let specialistOrders = [];
let specialistAllOrders = [];
let openedOrderId = null;
let focusedOrderId = null;

let activeSpecialistTab = "orders";

/* ===================== STATUS / UI ===================== */

function setPageStatus(text, isError = false) {
  const el = document.getElementById("pageStatus");

  if (!el) {
    return;
  }

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
  return getOrderId(order);
}

/* ===================== CACHE ===================== */

function updateOrderInCaches(order) {
  if (!order) {
    return;
  }

  const orderId = getSpecialistOrderId(order);

  if (!orderId) {
    return;
  }

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

function resetFocusedState() {
  focusedOrderId = null;
  openedOrderId = null;
  updateWorkspaceChrome();
}

function orderMatchesCurrentSpecialistFilter(order) {
  const filter = getStatusFilterValue();

  if (!filter) {
    return true;
  }

  return String(order?.status || "").trim().toUpperCase() ===
    String(filter).trim().toUpperCase();
}

/* ===================== API WRAPPERS ===================== */

async function fetchSpecialistOrdersSafe(status = "") {
  if (typeof fetchSpecialistOrders !== "function") {
    throw new Error("fetchSpecialistOrders не підключено. Перевір specialist-api.js.");
  }

  const data = await fetchSpecialistOrders(status);
  return Array.isArray(data) ? data : [];
}

async function fetchSpecialistOrderByIdSafe(orderId) {
  if (typeof fetchSpecialistOrderById !== "function") {
    throw new Error("fetchSpecialistOrderById не підключено. Перевір specialist-api.js.");
  }

  return await fetchSpecialistOrderById(orderId);
}

/* ===================== POINT ORDER REFRESH ===================== */

async function refreshSpecialistOrderOnly(orderId) {
  if (!orderId) {
    return null;
  }

  try {
    const order = await fetchSpecialistOrderByIdSafe(orderId);

    updateOrderInCaches(order);

    if (typeof updateSpecialistTabBadges === "function") {
      updateSpecialistTabBadges();
    }

    if (activeSpecialistTab !== "orders") {
      return order;
    }

    const id = String(orderId);
    const isFocused = Boolean(focusedOrderId) && String(focusedOrderId) === id;

    if (!isFocused && !orderMatchesCurrentSpecialistFilter(order)) {
      if (typeof removeSpecialistRenderedOrder === "function") {
        removeSpecialistRenderedOrder(id);
      }

      return order;
    }

    if (typeof replaceSpecialistRenderedOrder === "function") {
      const replaced = replaceSpecialistRenderedOrder(order);

      if (replaced) {
        return order;
      }
    }

    renderOrders(specialistOrders);
    return order;
  } catch (e) {
    console.error("refreshSpecialistOrderOnly error:", e);

    const id = String(orderId);
    specialistOrders = specialistOrders.filter(order => getSpecialistOrderId(order) !== id);
    specialistAllOrders = specialistAllOrders.filter(order => getSpecialistOrderId(order) !== id);

    if (typeof removeSpecialistRenderedOrder === "function") {
      removeSpecialistRenderedOrder(id);
    }

    if (typeof updateSpecialistTabBadges === "function") {
      updateSpecialistTabBadges();
    }

    return null;
  }
}

/* ===================== ORDERS LOADING ===================== */

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
    const orders = sortOrdersNewFirst(data);

    specialistOrders = orders;

    if (!status || updateAllCache || statusOverride === "") {
      specialistAllOrders = orders;
    }

    if (typeof updateSpecialistTabBadges === "function") {
      updateSpecialistTabBadges();
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
        container.innerHTML = `
          <div class="error-box">
            ${escapeHtml(e.message || "Помилка завантаження")}
          </div>
        `;
      }
    }

    if (!silent) {
      setPageStatus("Помилка завантаження заявок: " + e.message, true);
    }

    return [];
  }
}

async function ensureSpecialistAllOrdersLoaded(force = false) {
  if (
    !force &&
    Array.isArray(specialistAllOrders) &&
    specialistAllOrders.length > 0
  ) {
    if (typeof updateSpecialistTabBadges === "function") {
      updateSpecialistTabBadges();
    }

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
  if (!orderId) {
    return null;
  }

  if (focusedOrderId) {
    focusedOrderId = String(orderId);
    openedOrderId = String(orderId);
  }

  return await refreshSpecialistOrderOnly(orderId);
}

/* ===================== ORDER WORKSPACE ===================== */

function toggleDetails(orderId) {
  if (!orderId) {
    return;
  }

  if (typeof toggleSpecialistOrderDetailsOnly === "function") {
    toggleSpecialistOrderDetailsOnly(orderId);
    return;
  }

  const id = String(orderId);

  openedOrderId = openedOrderId === id ? null : id;
  renderOrders(specialistOrders);
}

async function openOrderWorkspace(orderId) {
  if (!orderId) {
    return;
  }

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
  resetFocusedState();

  if (activeSpecialistTab !== "orders") {
    await switchSpecialistTab("orders", false);
  }

  await loadOrders({
    render: true,
    statusOverride: getStatusFilterValue(),
    silent: true
  });
}

/* ===================== REFRESH ===================== */

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

/* ===================== TABS ===================== */

function initSpecialistTabs() {
  const buttons = document.querySelectorAll("[data-specialist-tab]");

  buttons.forEach(button => {
    button.addEventListener("click", async () => {
      const tab = button.dataset.specialistTab;
      await switchSpecialistTab(tab);
    });
  });
}

function setActiveSpecialistTabButton(targetTab) {
  document.querySelectorAll("[data-specialist-tab]").forEach(button => {
    const isActive = button.dataset.specialistTab === targetTab;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function setActiveSpecialistPanel(targetTab) {
  document.querySelectorAll("[data-specialist-panel]").forEach(panel => {
    panel.hidden = panel.dataset.specialistPanel !== targetTab;
  });
}

async function switchSpecialistTab(tab, shouldLoad = true) {
  const targetTab = tab || "orders";

  activeSpecialistTab = targetTab;

  setActiveSpecialistTabButton(targetTab);
  setActiveSpecialistPanel(targetTab);

  if (targetTab !== "orders") {
    resetFocusedState();
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

/* ===================== HEADER ===================== */

async function loadHeaderUser() {
  const nameEl = document.getElementById("headerUserName");
  const roleEl = document.querySelector(".app-user-role");
  const helloEl = document.getElementById("hello");

  try {
    const user = await apiRequest("/api/auth/me", {
      method: "GET"
    });

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
      roleEl.textContent = formatRole(user?.role || "SPECIALIST");
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

/* ===================== INIT ===================== */

function initSpecialistStatusFilter() {
  const filter = document.getElementById("statusFilter");

  if (!filter) {
    return;
  }

  filter.addEventListener("change", async () => {
    resetFocusedState();

    await loadOrders({
      render: activeSpecialistTab === "orders",
      statusOverride: getStatusFilterValue()
    });
  });
}

window.loadHeaderUser = loadHeaderUser;
window.handleRefresh = handleRefresh;
window.openOrderWorkspace = openOrderWorkspace;
window.closeOrderWorkspace = closeOrderWorkspace;
window.toggleDetails = toggleDetails;
window.loadOrders = loadOrders;
window.refreshFocusedOrder = refreshFocusedOrder;
window.refreshSpecialistOrderOnly = refreshSpecialistOrderOnly;
window.ensureSpecialistAllOrdersLoaded = ensureSpecialistAllOrdersLoaded;

window.addEventListener("DOMContentLoaded", async () => {
  initSpecialistTabs();
  initSpecialistStatusFilter();

  await loadHeaderUser();

  if (typeof initSpecialistAnalyticsFilters === "function") {
    initSpecialistAnalyticsFilters();
  }

  await switchSpecialistTab("orders", true);
  await ensureSpecialistAllOrdersLoaded();
});
