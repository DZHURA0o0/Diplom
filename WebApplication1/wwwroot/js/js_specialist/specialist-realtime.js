let specialistRealtimeConnection = null;
let specialistToastTimer = null;
let specialistRealtimeStarted = false;

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
    workerId: payload.workerId || payload.WorkerId || "",
    specialistId: payload.specialistId || payload.SpecialistId || "",
    status: payload.status || payload.Status || "",
    eventType: payload.eventType || payload.EventType || "orderChanged",
    message: payload.message || payload.Message || "Заявку оновлено."
  };
}

function getRealtimeStatusMessage(status) {
  if (!status) {
    return "Дані заявки оновлено.";
  }

  return `Новий статус: ${formatStatus(status)}`;
}

function isSpecialistDetailRequestRealtimeEvent(data = {}) {
  return String(data.eventType || "").toLowerCase().includes("detailrequest");
}

async function refreshSpecialistPageAfterRealtime(orderId) {
  if (orderId && typeof refreshSpecialistOrderOnly === "function") {
    await refreshSpecialistOrderOnly(orderId);
  }

  if (typeof activeSpecialistTab !== "undefined") {
    if (activeSpecialistTab === "details" && typeof renderSpecialistDetailRequestsTab === "function") {
      renderSpecialistDetailRequestsTab();
    }

    if (activeSpecialistTab === "reworks" && typeof renderSpecialistReworksTab === "function") {
      renderSpecialistReworksTab();
    }

    if (activeSpecialistTab === "analytics" && typeof loadSpecialistAnalytics === "function") {
      await loadSpecialistAnalytics();
    }
  }
}

function buildSpecialistRealtimeConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl("/hubs/realtime", {
      accessTokenFactory: () => getToken()
    })
    .withAutomaticReconnect()
    .build();
}

function registerSpecialistRealtimeHandlers(connection) {
  connection.on("orderChanged", async payload => {
    const data = normalizeRealtimePayload(payload);

    console.log("SignalR orderChanged:", data);

    if (isSpecialistDetailRequestRealtimeEvent(data)) {
      return;
    }

    if (typeof setPageStatus === "function") {
      setPageStatus(data.message);
    }

    try {
      await refreshSpecialistPageAfterRealtime(data.orderId);
    } catch (e) {
      console.error("Realtime refresh error:", e);
    }

    showSpecialistToast("Заявку оновлено", getRealtimeStatusMessage(data.status));
  });

  connection.on("detailRequestChanged", async payload => {
    const data = normalizeRealtimePayload(payload);

    console.log("SignalR detailRequestChanged:", data);

    if (typeof setPageStatus === "function") {
      setPageStatus(data.message || "Запити деталей оновлено.");
    }

    try {
      await refreshSpecialistPageAfterRealtime(data.orderId);
    } catch (e) {
      console.error("Detail request realtime refresh error:", e);
    }

    showSpecialistToast("Запити деталей оновлено", getRealtimeStatusMessage(data.status));
  });

  connection.on("orderStatusChanged", async payload => {
    const data = normalizeRealtimePayload(payload);
    await refreshSpecialistPageAfterRealtime(data.orderId);
  });

  connection.onreconnecting(error => {
    console.warn("SignalR reconnecting:", error);

    if (typeof setPageStatus === "function") {
      setPageStatus("Відновлення realtime-з'єднання...");
    }
  });

  connection.onreconnected(async () => {
    console.log("SignalR reconnected.");

    if (typeof setPageStatus === "function") {
      setPageStatus("Realtime-з'єднання відновлено.");
    }

    if (typeof loadOrders === "function") {
      await loadOrders({
        render: typeof activeSpecialistTab === "undefined" || activeSpecialistTab === "orders",
        silent: true
      });
    }

    if (typeof ensureSpecialistAllOrdersLoaded === "function") {
      await ensureSpecialistAllOrdersLoaded(true);
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
    <div class="specialist-toast-title">${escapeHtml(title)}</div>
    <div class="specialist-toast-message">${escapeHtml(message)}</div>
  `;

  toast.classList.add("visible");

  clearTimeout(specialistToastTimer);

  specialistToastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 4000);
}

window.startSpecialistRealtime = startSpecialistRealtime;
window.stopSpecialistRealtime = stopSpecialistRealtime;
window.showSpecialistToast = showSpecialistToast;

window.addEventListener("DOMContentLoaded", () => {
  startSpecialistRealtime();
});
