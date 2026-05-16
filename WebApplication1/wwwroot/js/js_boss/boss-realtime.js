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

function isBossDetailRequestRealtimeEvent(payload = {}) {
    const eventType = payload?.eventType || payload?.EventType || "";
    return String(eventType).toLowerCase().includes("detailrequest");
}

async function refreshBossAfterRealtime() {
    if (typeof updateComplaintsBadge === "function") {
        await updateComplaintsBadge();
    }

    if (typeof updateRegistrationsBadge === "function") {
        await updateRegistrationsBadge();
    }

    if (activeTab === "orders" && typeof loadOrders === "function") {
        await loadOrders();
    } else if (activeTab === "complaints" && typeof loadComplaintsOrders === "function") {
        await loadComplaintsOrders();
    } else if (activeTab === "users" && typeof loadUsers === "function") {
        await loadUsers();
    } else if (activeTab === "analytics" && typeof loadAnalytics === "function") {
        await loadAnalytics();
    }
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

async function refreshBossUsersAfterRealtime() {
    if (typeof resetBossPeopleCache === "function") {
        resetBossPeopleCache();
    }

    if (typeof updateRegistrationsBadge === "function") {
        await updateRegistrationsBadge();
    }

    if (typeof activeTab !== "undefined" && activeTab === "users" && typeof loadUsers === "function") {
        await loadUsers();
    }
}

function registerBossRealtimeHandlers(connection) {
    connection.on("orderChanged", async payload => {
        console.log("SignalR orderChanged:", payload);

        if (isBossDetailRequestRealtimeEvent(payload)) {
            return;
        }

        try {
            const orderId = payload?.orderId || payload?.OrderId || payload?.id || payload?.Id || "";
            await refreshBossOrderAfterRealtime(orderId);
        } catch (e) {
            console.error("Boss realtime refresh error:", e);
        }
    });

    connection.on("detailRequestChanged", async payload => {
        console.log("SignalR detailRequestChanged:", payload);

        try {
            const orderId = payload?.orderId || payload?.OrderId || payload?.id || payload?.Id || "";
            await refreshBossOrderAfterRealtime(orderId);
        } catch (e) {
            console.error("Boss detail realtime refresh error:", e);
        }
    });

    connection.on("userChanged", async payload => {
        console.log("SignalR userChanged:", payload);

        try {
            await refreshBossUsersAfterRealtime();
        } catch (e) {
            console.error("Boss user realtime refresh error:", e);
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
