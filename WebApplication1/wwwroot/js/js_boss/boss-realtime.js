let bossRealtimeConnection = null;
let bossRealtimeStarted = false;

function canUseBossRealtime() {
    return typeof signalR !== "undefined" && typeof getToken === "function" && Boolean(getToken());
}

function buildBossRealtimeConnection() {
    return new signalR.HubConnectionBuilder()
        .withUrl("/hubs/realtime", {
            accessTokenFactory: () => getToken()
        })
        .withAutomaticReconnect()
        .build();
}

async function refreshBossAfterRealtime() {
    return;
}

async function refreshBossOrderAfterRealtime(orderId) {
    if (!orderId) {
        return;
    }

    if (typeof activeTab === "undefined" || activeTab === "orders") {
        if (typeof updateRenderedOrderOnly === "function") {
            await updateRenderedOrderOnly(orderId, { tbodyId: "orders" });
        }
    } else if (activeTab === "complaints") {
        if (typeof updateRenderedOrderOnly === "function") {
            await updateRenderedOrderOnly(orderId, { tbodyId: "complaintsOrders" });
        }
    } else if (activeTab === "analytics") {
        if (typeof loadAnalytics === "function") {
            await loadAnalytics();
        }
    }

    if (typeof updateComplaintsBadge === "function") {
        await updateComplaintsBadge();
    }
}

function registerBossRealtimeHandlers(connection) {
    connection.on("orderChanged", async payload => {
        console.log("SignalR orderChanged:", payload);

        try {
            const orderId = payload?.orderId || payload?.OrderId || payload?.id || payload?.Id || "";
            await refreshBossOrderAfterRealtime(orderId);
        } catch (e) {
            console.error("Boss realtime refresh error:", e);
        }
    });

    connection.onreconnecting(() => {
        if (typeof setStatus === "function") {
            setStatus("Відновлення realtime-з'єднання...");
        }
    });

    connection.onreconnected(async () => {
        if (typeof setStatus === "function") {
            setStatus("Realtime-з'єднання відновлено.");
        }

        await refreshBossAfterRealtime();
    });

    connection.onclose(error => {
        console.warn("SignalR closed:", error);
        bossRealtimeStarted = false;
    });
}

async function startBossRealtime() {
    if (bossRealtimeStarted || !canUseBossRealtime()) {
        return;
    }

    bossRealtimeConnection = buildBossRealtimeConnection();
    registerBossRealtimeHandlers(bossRealtimeConnection);

    try {
        await bossRealtimeConnection.start();
        bossRealtimeStarted = true;
        console.log("SignalR connected: boss realtime.");
    } catch (e) {
        bossRealtimeStarted = false;
        console.error("Boss SignalR connection error:", e);
    }
}

window.startBossRealtime = startBossRealtime;

window.addEventListener("DOMContentLoaded", () => {
    startBossRealtime();
});
