let activeTab = "orders";

function setStatus(text, isError = false) {
    const el = document.getElementById("status");
    if (!el) return;

    el.textContent = text || "";
    el.className = isError ? "status-text error" : "status-text";
}

function resetBossPeopleCache() {
    if (typeof bossPeopleLoaded !== "undefined") {
        bossPeopleLoaded = false;
    }

    if (typeof bossWorkersMap !== "undefined") {
        bossWorkersMap = {};
    }

    if (typeof bossSpecialists !== "undefined") {
        bossSpecialists = [];
    }

    if (typeof bossSpecialistsMap !== "undefined") {
        bossSpecialistsMap = {};
    }

    if (typeof analyticsSpecialistsLoaded !== "undefined") {
        analyticsSpecialistsLoaded = false;
    }
}

function resetOrdersCache() {
    if (typeof ordersExpandedState !== "undefined") {
        ordersExpandedState = {};
    }

    if (typeof orderDetailsCache !== "undefined") {
        orderDetailsCache = {};
    }
}

function initBossFilters() {
    const statusFilter = document.getElementById("statusFilter");

    if (statusFilter) {
        statusFilter.addEventListener("change", async () => {
            if (typeof loadOrders !== "function") return;

            resetOrdersCache();
            await loadOrders();

            if (typeof updateComplaintsBadge === "function") {
                await updateComplaintsBadge();
            }
        });
    }

    const roleFilter = document.getElementById("roleFilter");

    if (roleFilter) {
        roleFilter.addEventListener("change", async () => {
            if (typeof loadUsers !== "function") return;
            await loadUsers();
        });
    }

    const accountStatusFilter = document.getElementById("accountStatusFilter");

    if (accountStatusFilter) {
        accountStatusFilter.addEventListener("change", async () => {
            if (typeof loadUsers !== "function") return;
            await loadUsers();
        });
    }

    if (typeof initBossAnalyticsFilters === "function") {
        initBossAnalyticsFilters();
    }
}

function setVisibleTab(tabName) {
    const tabs = {
        orders: document.getElementById("ordersTab"),
        complaints: document.getElementById("complaintsTab"),
        users: document.getElementById("usersTab"),
        analytics: document.getElementById("analyticsTab")
    };

    Object.entries(tabs).forEach(([name, element]) => {
        element?.classList.toggle("hidden", tabName !== name);
    });
}

function setActiveTabButton(tabName) {
    const buttons = {
        orders: document.getElementById("tabOrdersBtn"),
        complaints: document.getElementById("tabComplaintsBtn"),
        users: document.getElementById("tabUsersBtn"),
        analytics: document.getElementById("tabAnalyticsBtn")
    };

    Object.entries(buttons).forEach(([name, button]) => {
        button?.classList.toggle("active", tabName === name);
    });
}

function refreshComplaintsBadgeIfPossible() {
    if (typeof updateComplaintsBadge === "function") {
        updateComplaintsBadge();
    }
}

function showTab(tabName) {
    activeTab = tabName;

    setVisibleTab(tabName);
    setActiveTabButton(tabName);

    const tabLoaders = {
        orders: loadOrders,
        complaints: loadComplaintsOrders,
        users: loadUsers,
        analytics: loadAnalytics
    };

    if (typeof tabLoaders[tabName] === "function") {
        tabLoaders[tabName]();
    }

    refreshComplaintsBadgeIfPossible();
}

async function loadHeaderUser() {
    const roleEl = document.getElementById("headerUserRole");
    const nameEl = document.getElementById("headerUserName");

    try {
        const me = await fetchMe();

        const role = me.role || me.roleInSystem || me.role_in_system || "BOSS";
        const fullName = me.fullName || me.full_name || me.name || me.login || "Начальник";
        const login = me.login || "";

        if (roleEl) {
            roleEl.textContent = role === "BOSS"
                ? "Начальник відділу"
                : formatRole(role);
        }

        if (nameEl) {
            nameEl.textContent = fullName !== "Начальник"
                ? fullName
                : (login || "Начальник");
        }
    } catch (e) {
        console.error(e);

        if (roleEl) roleEl.textContent = "Начальник відділу";
        if (nameEl) nameEl.textContent = "—";
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    initBossFilters();

    await loadHeaderUser();

    if (typeof updateComplaintsBadge === "function") {
        await updateComplaintsBadge();
    }

    showTab("orders");
});