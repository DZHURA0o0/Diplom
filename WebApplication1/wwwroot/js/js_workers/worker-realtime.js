let workerRealtimeConnection = null;
let workerRealtimeStarted = false;

function canUseWorkerRealtime() {
  return typeof signalR !== "undefined" && typeof getToken === "function" && Boolean(getToken());
}

function buildWorkerRealtimeConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl("/hubs/realtime", {
      accessTokenFactory: () => getToken()
    })
    .withAutomaticReconnect()
    .build();
}

function registerWorkerRealtimeHandlers(connection) {
  connection.on("orderChanged", async payload => {
    console.log("SignalR orderChanged:", payload);

    try {
      const orderId = payload?.orderId || payload?.OrderId || payload?.id || payload?.Id || "";

      if (orderId && typeof refreshWorkerOrderOnly === "function") {
        await refreshWorkerOrderOnly(orderId);
      }
    } catch (e) {
      console.error("Worker realtime refresh error:", e);
    }
  });

  connection.onclose(error => {
    console.warn("SignalR closed:", error);
    workerRealtimeStarted = false;
  });

  connection.onreconnected(async () => {
    if (typeof loadOrders === "function") {
      await loadOrders();
    }
  });
}

async function startWorkerRealtime() {
  if (workerRealtimeStarted || !canUseWorkerRealtime()) {
    return;
  }

  workerRealtimeConnection = buildWorkerRealtimeConnection();
  registerWorkerRealtimeHandlers(workerRealtimeConnection);

  try {
    await workerRealtimeConnection.start();
    workerRealtimeStarted = true;
    console.log("SignalR connected: worker realtime.");
  } catch (e) {
    workerRealtimeStarted = false;
    console.error("Worker SignalR connection error:", e);
  }
}

window.startWorkerRealtime = startWorkerRealtime;

window.addEventListener("DOMContentLoaded", () => {
  startWorkerRealtime();
});
