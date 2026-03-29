const ordersElement = document.getElementById("orders");
const statusElement = document.getElementById("status");

async function loadOrders() {
  if (!ordersElement) return;

  ordersElement.innerHTML = `<div class="empty">Завантаження...</div>`;

  try {
    const status = statusElement?.value?.trim() ?? "";
    const data = await fetchMyOrders(status);
    const sorted = sortOrdersNewFirst(Array.isArray(data) ? data : []);
    renderOrders(sorted);
  } catch (e) {
    ordersElement.innerHTML = `
      <div class="error-box">
        ${escapeHtml(String(e))}
      </div>
    `;
  }
}

function goToComplaintPage(orderId) {
  if (!orderId) return;
  window.location.href = `/create-complaint.html?orderId=${encodeURIComponent(orderId)}`;
}

async function initWorkerPage() {
  try {
    await requireRole(["WORKER"]);

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

document.addEventListener("DOMContentLoaded", initWorkerPage);