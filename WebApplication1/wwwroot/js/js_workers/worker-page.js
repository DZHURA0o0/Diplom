const ordersElement = document.getElementById("orders");
const statusElement = document.getElementById("status");

document.addEventListener("DOMContentLoaded", async () => {
  loadHeaderUser();
  await loadOrders();
});

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
async function loadHeaderUser() {
  const roleEl = document.getElementById("headerUserRole");
  const nameEl = document.getElementById("headerUserName");
  const positionEl = document.getElementById("headerUserPosition");

  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    if (!res.ok) throw new Error("Failed to load user");

    const data = await res.json();

    if (roleEl) {
      if (data.role === "WORKER") roleEl.textContent = "Працівник";
      else if (data.role === "SPECIALIST") roleEl.textContent = "Спеціаліст";
      else if (data.role === "BOSS") roleEl.textContent = "Начальник";
      else roleEl.textContent = data.role || "";
    }

    if (nameEl) {
      nameEl.textContent = data.fullName || data.login || "Користувач";
    }

    if (positionEl) {
      positionEl.textContent = data.position || "";
    }
  } catch (e) {
    console.error("HEADER LOAD ERROR:", e);

    if (roleEl) roleEl.textContent = "";
    if (nameEl) nameEl.textContent = "Користувач";
    if (positionEl) positionEl.textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", initWorkerPage);