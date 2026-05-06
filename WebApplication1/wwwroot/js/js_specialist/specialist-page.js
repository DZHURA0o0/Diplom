requireRole(["SPECIALIST"]);

let specialistOrders = [];
let openedOrderId = null;

// Якщо не null — спеціаліст знаходиться в режимі обробки однієї заявки
let focusedOrderId = null;

window.addEventListener("DOMContentLoaded", async () => {
  const filter = document.getElementById("statusFilter");

  if (filter) {
    filter.addEventListener("change", async () => {
      focusedOrderId = null;
      openedOrderId = null;
      await loadOrders();
    });
  }

  await loadHeaderUser();
  await loadOrders();
});

function setPageStatus(text, isError = false) {
  const el = document.getElementById("pageStatus");
  if (!el) return;

  el.textContent = text ?? "";
  el.className = isError ? "status-text error" : "status-text";
}

function updateWorkspaceChrome() {
  const isFocusMode = Boolean(focusedOrderId);

  const filterBox = document.querySelector(".specialist-filter");
  const ordersHeader = document.querySelector(".orders-header");
  const card = document.querySelector(".specialist-card");
  const title = document.getElementById("hello");
  const backBtn = document.getElementById("backToOrdersTopBtn");

  if (filterBox) {
    filterBox.style.display = isFocusMode ? "none" : "";
  }

  if (ordersHeader) {
    ordersHeader.style.display = isFocusMode ? "none" : "";
  }

  if (card) {
    card.classList.toggle("single-order-mode", isFocusMode);
  }

  if (title) {
    title.textContent = isFocusMode
      ? "Обробка заявки"
      : "Заявки спеціаліста";
  }

  if (backBtn) {
    backBtn.hidden = !isFocusMode;
  }
}
function toggleDetails(id) {
  if (focusedOrderId) {
    openedOrderId = id;
    renderOrders(specialistOrders);
    return;
  }

  openedOrderId = openedOrderId === id ? null : id;
  renderOrders(specialistOrders);
}

async function handleRefresh() {
  if (focusedOrderId) {
    await refreshFocusedOrder(focusedOrderId);
    return;
  }

  await loadOrders();
}

async function loadOrders() {
  const container = document.getElementById("orders");
  const status = document.getElementById("statusFilter")?.value ?? "";

  focusedOrderId = null;
  openedOrderId = null;
  updateWorkspaceChrome();

  if (container) {
    container.innerHTML = `<div class="empty">Завантаження...</div>`;
  }

  setPageStatus("Завантаження...");

  try {
    const data = await fetchSpecialistOrders(status);
    specialistOrders = sortOrdersNewFirst(data);

    renderOrders(specialistOrders);
    setPageStatus(`Завантажено заявок: ${specialistOrders.length}`);
  } catch (e) {
    console.error(e);

    if (container) {
      container.innerHTML = `
        <div class="error-box">
          ${escapeHtml(e.message || "Не вдалося завантажити заявки.")}
        </div>
      `;
    }

    setPageStatus("Помилка завантаження.", true);
  }
}

async function openOrderWorkspace(orderId) {
  focusedOrderId = String(orderId);
  openedOrderId = String(orderId);
  updateWorkspaceChrome();

  await refreshFocusedOrder(orderId);
}

async function closeOrderWorkspace() {
  focusedOrderId = null;
  openedOrderId = null;
  updateWorkspaceChrome();

  await loadOrders();
}

function mergeOrderIntoCache(order) {
  const id = getOrderId(order);
  const index = specialistOrders.findIndex(x => getOrderId(x) === id);

  if (index >= 0) {
    specialistOrders[index] = order;
  } else {
    specialistOrders.push(order);
  }

  specialistOrders = sortOrdersNewFirst(specialistOrders);
}

async function refreshFocusedOrder(orderId) {
  const container = document.getElementById("orders");

  focusedOrderId = String(orderId);
  openedOrderId = String(orderId);
  updateWorkspaceChrome();

  if (container) {
    container.innerHTML = `<div class="empty">Завантаження заявки...</div>`;
  }

  setPageStatus("Завантаження заявки...");

  try {
    const order = await fetchSpecialistOrderById(orderId);
    mergeOrderIntoCache(order);

    renderOrders(specialistOrders);
    setPageStatus("Відкрита одна заявка для обробки.");
  } catch (e) {
    console.error(e);

    if (container) {
      container.innerHTML = `
        <div class="error-box">
          ${escapeHtml(e.message || "Не вдалося завантажити заявку.")}
        </div>
      `;
    }

    setPageStatus("Помилка завантаження заявки.", true);
  }
}

function parseJwt(tokenValue) {
  try {
    return JSON.parse(atob(tokenValue.split(".")[1]));
  } catch {
    return null;
  }
}

async function loadHeaderUser() {
  const nameEl = document.getElementById("headerUserName");
  const roleEl = document.querySelector(".app-user-role");

  if (!nameEl) {
    console.error("headerUserName not found");
    return;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) {
      throw new Error("Failed to load user");
    }

    const data = await res.json();

    nameEl.textContent =
      data.fullName ||
      data.login ||
      "Користувач";

    if (roleEl) {
      if (data.role === "SPECIALIST") roleEl.textContent = "Спеціаліст";
      else if (data.role === "WORKER") roleEl.textContent = "Працівник";
      else if (data.role === "BOSS") roleEl.textContent = "Начальник";
      else roleEl.textContent = data.role || "";
    }

  } catch (e) {
    console.error("HEADER LOAD ERROR:", e);
    nameEl.textContent = "Користувач";
  }
}