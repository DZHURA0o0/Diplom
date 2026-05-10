let specialistRealtimeConnection = null;
let specialistToastTimer = null;
let specialistRealtimeStarted = false;

/* ===================== REALTIME HELPERS ===================== */

function canUseSpecialistRealtime() {
  if (typeof signalR === "undefined") {
    console.warn("SignalR client library not loaded.");
    return false;
  }

  if (!getToken()) {
    console.warn("SignalR: token not found.");
    return false;
  }

  return true;
}

function isRealtimeConnected() {
  return specialistRealtimeConnection?.state === signalR.HubConnectionState.Connected;
}

function normalizeRealtimePayload(payload = {}) {
  return {
    orderId: payload.orderId || payload.OrderId || payload.id || payload.Id || "",
    status: payload.status || payload.Status || "",
    message: payload.message || payload.Message || "Статус заявки змінено."
  };
}

function getRealtimeStatusMessage(status) {
  if (!status) {
    return "Статус заявки змінено.";
  }

  return `Новий статус: ${formatStatus(status)}`;
}

async function refreshSpecialistPageAfterRealtime(orderId) {
  if (!orderId) {
    return;
  }

  if (typeof refreshSpecialistOrderOnly === "function") {
    await refreshSpecialistOrderOnly(orderId);
    return;
  }

  if (
    typeof focusedOrderId !== "undefined" &&
    focusedOrderId &&
    String(focusedOrderId) === String(orderId) &&
    typeof refreshFocusedOrder === "function"
  ) {
    await refreshFocusedOrder(orderId);
    return;
  }

  if (
    typeof activeSpecialistTab !== "undefined" &&
    activeSpecialistTab === "orders" &&
    typeof loadOrders === "function"
  ) {
    await loadOrders({
      render: true,
      silent: true
    });

    return;
  }

  if (typeof ensureSpecialistAllOrdersLoaded === "function") {
    await ensureSpecialistAllOrdersLoaded(true);
  }
}

/* ===================== CONNECTION ===================== */

function buildSpecialistRealtimeConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl("/hubs/specialist", {
      accessTokenFactory: () => getToken()
    })
    .withAutomaticReconnect()
    .build();
}

function registerSpecialistRealtimeHandlers(connection) {
  connection.on("orderStatusChanged", async payload => {
    const data = normalizeRealtimePayload(payload);

    console.log("SignalR orderStatusChanged:", data);

    if (typeof setPageStatus === "function") {
      setPageStatus(data.message);
    }

    try {
      await refreshSpecialistPageAfterRealtime(data.orderId);
    } catch (e) {
      console.error("Realtime refresh error:", e);
    }

    showSpecialistToast(
      "Статус заявки змінено",
      getRealtimeStatusMessage(data.status)
    );
  });

  connection.onreconnecting(error => {
    console.warn("SignalR reconnecting:", error);

    if (typeof setPageStatus === "function") {
      setPageStatus("Відновлення realtime-з’єднання...");
    }
  });

  connection.onreconnected(() => {
    console.log("SignalR reconnected.");

    if (typeof setPageStatus === "function") {
      setPageStatus("Realtime-з’єднання відновлено.");
    }
  });

  connection.onclose(error => {
    console.warn("SignalR closed:", error);
    specialistRealtimeStarted = false;
  });
}

async function startSpecialistRealtime() {
  if (specialistRealtimeStarted || isRealtimeConnected()) {
    return;
  }

  if (!canUseSpecialistRealtime()) {
    return;
  }

  specialistRealtimeConnection = buildSpecialistRealtimeConnection();
  registerSpecialistRealtimeHandlers(specialistRealtimeConnection);

  try {
    await specialistRealtimeConnection.start();
    specialistRealtimeStarted = true;
    console.log("SignalR connected: specialist realtime.");
  } catch (e) {
    specialistRealtimeStarted = false;
    console.error("SignalR connection error:", e);
  }
}

async function stopSpecialistRealtime() {
  if (!specialistRealtimeConnection) {
    return;
  }

  try {
    await specialistRealtimeConnection.stop();
  } catch (e) {
    console.error("SignalR stop error:", e);
  } finally {
    specialistRealtimeStarted = false;
    specialistRealtimeConnection = null;
  }
}

/* ===================== TOAST ===================== */

function getOrCreateSpecialistToast() {
  let toast = document.getElementById("specialistToast");

  if (toast) {
    return toast;
  }

  toast = document.createElement("div");
  toast.id = "specialistToast";
  toast.className = "specialist-toast";

  document.body.appendChild(toast);

  return toast;
}

function showSpecialistToast(title, message) {
  const toast = getOrCreateSpecialistToast();

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

/* ===================== GLOBAL EXPORTS ===================== */

window.startSpecialistRealtime = startSpecialistRealtime;
window.stopSpecialistRealtime = stopSpecialistRealtime;
window.showSpecialistToast = showSpecialistToast;

window.addEventListener("DOMContentLoaded", () => {
  startSpecialistRealtime();
});