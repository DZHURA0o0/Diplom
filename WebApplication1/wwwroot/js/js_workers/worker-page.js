const ordersElement = document.getElementById("orders");
const statusElement = document.getElementById("status");

window.workerOrdersState = window.workerOrdersState || {
  orders: []
};

async function loadOrders() {
  if (!ordersElement) {
    return;
  }

  ordersElement.innerHTML = `<div class="empty">Завантаження...</div>`;

  try {
    const status = statusElement?.value?.trim() ?? "";
    const data = await fetchMyOrders(status);
    const sorted = sortOrdersNewFirst(data);

    window.workerOrdersState.orders = sorted;

    renderOrders(sorted);
  } catch (e) {
    ordersElement.innerHTML = `
      <div class="error-box">
        ${escapeHtml(String(e))}
      </div>
    `;
  }
}

function updateWorkerOrderInCache(orderId, patch) {
  const id = String(orderId);
  const list = window.workerOrdersState?.orders || [];

  const index = list.findIndex(order => getOrderId(order) === id);

  if (index < 0) {
    return null;
  }

  list[index] = {
    ...list[index],
    ...patch
  };

  return list[index];
}

function removeWorkerOrderFromCache(orderId) {
  const id = String(orderId);
  const list = window.workerOrdersState?.orders || [];
  window.workerOrdersState.orders = list.filter(order => getOrderId(order) !== id);
}

function workerOrderMatchesCurrentFilter(order) {
  const currentStatus = statusElement?.value?.trim().toUpperCase() ?? "";

  if (!currentStatus) {
    return true;
  }

  return String(order?.status || "").trim().toUpperCase() === currentStatus;
}

async function refreshWorkerOrderOnly(orderId) {
  if (!orderId || typeof fetchMyOrderById !== "function") {
    return null;
  }

  try {
    const order = await fetchMyOrderById(orderId);

    if (!workerOrderMatchesCurrentFilter(order)) {
      removeWorkerOrderFromCache(orderId);

      if (typeof removeWorkerRenderedOrder === "function") {
        removeWorkerRenderedOrder(orderId);
      }

      return order;
    }

    const list = window.workerOrdersState?.orders || [];
    const index = list.findIndex(item => getOrderId(item) === String(orderId));

    if (index >= 0) {
      list[index] = order;

      if (typeof replaceWorkerRenderedOrder === "function") {
        replaceWorkerRenderedOrder(order);
      }
    } else {
      window.workerOrdersState.orders = sortOrdersNewFirst([order, ...list]);
      renderOrders(window.workerOrdersState.orders);
    }

    return order;
  } catch (e) {
    console.error("refreshWorkerOrderOnly error:", e);
    return null;
  }
}

function goToComplaintPage(orderId, status) {
  if (!orderId) {
    return;
  }

  if (typeof isDoneStatus === "function" && !isDoneStatus(status)) {
    return;
  }

  if (typeof openWorkerComplaintModal === "function") {
    openWorkerComplaintModal(orderId);
    return;
  }

  console.error("Worker complaint modal is not loaded.");
}

async function initWorkerPage() {
  try {
    await requireRole(["WORKER"]);
    await loadHeaderUser();

    if (statusElement) {
      statusElement.addEventListener("change", loadOrders);
    }

    await loadOrders();
  } catch (e) {
    console.error("worker-page init error:", e);

    if (ordersElement) {
      ordersElement.innerHTML = `
        <div class="error-box">
          Не вдалося завантажити заявки
        </div>
      `;
    }
  }
}

async function loadHeaderUser() {
  const roleEl = document.getElementById("headerUserRole");
  const nameEl = document.getElementById("headerUserName");
  const positionEl = document.getElementById("headerUserPosition");

  try {
    const data = await apiRequest("/api/auth/me", {
      method: "GET"
    });

    if (roleEl) {
      roleEl.textContent = formatRole(data.role);
    }

    if (nameEl) {
      nameEl.textContent = data.fullName || data.login || "Користувач";
    }

    if (positionEl) {
      positionEl.textContent = data.position || "";
    }
  } catch (e) {
    console.error("HEADER LOAD ERROR:", e);

    if (roleEl) {
      roleEl.textContent = "";
    }

    if (nameEl) {
      nameEl.textContent = "Користувач";
    }

    if (positionEl) {
      positionEl.textContent = "";
    }
  }
}

window.loadOrders = loadOrders;
window.updateWorkerOrderInCache = updateWorkerOrderInCache;
window.refreshWorkerOrderOnly = refreshWorkerOrderOnly;
window.goToComplaintPage = goToComplaintPage;

document.addEventListener("DOMContentLoaded", initWorkerPage);
