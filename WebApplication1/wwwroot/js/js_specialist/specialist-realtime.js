let specialistRealtimeConnection = null;
let specialistToastTimer = null;

async function startSpecialistRealtime() {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("SignalR: token not found.");
    return;
  }

  if (typeof signalR === "undefined") {
    console.warn("SignalR client library not loaded.");
    return;
  }

  specialistRealtimeConnection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/specialist", {
      accessTokenFactory: () => localStorage.getItem("token")
    })
    .withAutomaticReconnect()
    .build();

  specialistRealtimeConnection.on("orderStatusChanged", async payload => {
    console.log("Order status changed:", payload);

    const orderId = payload.orderId;
    const status = payload.status;
    const message = payload.message || "Статус заявки змінено.";

    setPageStatus(message);

    if (focusedOrderId && String(focusedOrderId) === String(orderId)) {
      await refreshFocusedOrder(orderId);

      showSpecialistToast(
        "Статус заявки змінено",
        `Новий статус: ${formatStatus(status)}`
      );

      return;
    }

    await loadOrders();

    showSpecialistToast(
      "Статус заявки змінено",
      `Новий статус: ${formatStatus(status)}`
    );
  });

  try {
    await specialistRealtimeConnection.start();
    console.log("SignalR connected: specialist realtime.");
  } catch (e) {
    console.error("SignalR connection error:", e);
  }
}

function showSpecialistToast(title, message) {
  let toast = document.getElementById("specialistToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "specialistToast";
    toast.className = "specialist-toast";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div class="specialist-toast-title">🔔 ${escapeHtml(title)}</div>
    <div class="specialist-toast-message">${escapeHtml(message)}</div>
  `;

  toast.classList.add("visible");

  clearTimeout(specialistToastTimer);

  specialistToastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 4000);
}

window.addEventListener("DOMContentLoaded", () => {
  startSpecialistRealtime();
});