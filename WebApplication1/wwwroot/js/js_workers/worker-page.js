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
window.goToComplaintPage = goToComplaintPage;

document.addEventListener("DOMContentLoaded", initWorkerPage);