requireRole(["SPECIALIST"]);

let specialistOrders = [];
let openedOrderId = null;

window.addEventListener("DOMContentLoaded", async () => {
  const filter = document.getElementById("statusFilter");

  if (filter) {
    filter.addEventListener("change", loadOrders);
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

function toggleDetails(id) {
  openedOrderId = openedOrderId === id ? null : id;
  renderOrders(specialistOrders);
}

async function loadOrders() {
  const container = document.getElementById("orders");
  const status = document.getElementById("statusFilter")?.value ?? "";

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
      container.innerHTML = `<div class="error-box">${escapeHtml(e.message || "Не вдалося завантажити заявки.")}</div>`;
    }

    setPageStatus("Помилка завантаження.", true);
  }
}
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
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

    console.log("ME:", data);

    // ІМ'Я
    nameEl.textContent =
      data.fullName ||
      data.login ||
      "Користувач";

    // РОЛЬ
    if (roleEl) {
      if (data.role === "SPECIALIST") roleEl.textContent = "Спеціаліст";
      else if (data.role === "WORKER") roleEl.textContent = "Працівник";
      else if (data.role === "BOSS") roleEl.textContent = "Начальник";
      else roleEl.textContent = data.role;
    }

  } catch (e) {
    console.error("HEADER LOAD ERROR:", e);
    nameEl.textContent = "Користувач";
  }
}