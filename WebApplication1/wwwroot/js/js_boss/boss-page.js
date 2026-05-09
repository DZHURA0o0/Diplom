let activeTab = "orders";

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
}

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
    const ordersTab = document.getElementById("ordersTab");
    const complaintsTab = document.getElementById("complaintsTab");
    const usersTab = document.getElementById("usersTab");
    const analyticsTab = document.getElementById("analyticsTab");

    if (ordersTab) {
        ordersTab.classList.toggle("hidden", tabName !== "orders");
    }

    if (complaintsTab) {
        complaintsTab.classList.toggle("hidden", tabName !== "complaints");
    }

    if (usersTab) {
        usersTab.classList.toggle("hidden", tabName !== "users");
    }

    if (analyticsTab) {
        analyticsTab.classList.toggle("hidden", tabName !== "analytics");
    }
}

function setActiveTabButton(tabName) {
    const tabOrdersBtn = document.getElementById("tabOrdersBtn");
    const tabComplaintsBtn = document.getElementById("tabComplaintsBtn");
    const tabUsersBtn = document.getElementById("tabUsersBtn");
    const tabAnalyticsBtn = document.getElementById("tabAnalyticsBtn");

    if (tabOrdersBtn) {
        tabOrdersBtn.classList.toggle("active", tabName === "orders");
    }

    if (tabComplaintsBtn) {
        tabComplaintsBtn.classList.toggle("active", tabName === "complaints");
    }

    if (tabUsersBtn) {
        tabUsersBtn.classList.toggle("active", tabName === "users");
    }

    if (tabAnalyticsBtn) {
        tabAnalyticsBtn.classList.toggle("active", tabName === "analytics");
    }
}

function showTab(tabName) {
    activeTab = tabName;

    setVisibleTab(tabName);
    setActiveTabButton(tabName);

    if (tabName === "orders") {
        if (typeof loadOrders === "function") {
            loadOrders();
        }

        if (typeof updateComplaintsBadge === "function") {
            updateComplaintsBadge();
        }

        return;
    }

    if (tabName === "complaints") {
        if (typeof loadComplaintsOrders === "function") {
            loadComplaintsOrders();
        }

        if (typeof updateComplaintsBadge === "function") {
            updateComplaintsBadge();
        }

        return;
    }

    if (tabName === "users") {
        if (typeof loadUsers === "function") {
            loadUsers();
        }

        if (typeof updateComplaintsBadge === "function") {
            updateComplaintsBadge();
        }

        return;
    }

    if (tabName === "analytics") {
        if (typeof loadAnalytics === "function") {
            loadAnalytics();
        }

        if (typeof updateComplaintsBadge === "function") {
            updateComplaintsBadge();
        }
    }
}

async function loadHeaderUser() {
    try {
        const me = await fetchMe();

        const roleEl = document.getElementById("headerUserRole");
        const nameEl = document.getElementById("headerUserName");

        const role = me.role || me.roleInSystem || me.role_in_system || "BOSS";
        const fullName = me.fullName || me.full_name || me.name || me.login || "Начальник";
        const login = me.login || "";

        if (roleEl) {
            roleEl.textContent = role === "BOSS"
                ? "Начальник відділу"
                : role;
        }

        if (nameEl) {
            nameEl.textContent = fullName !== "Начальник"
                ? fullName
                : (login || "Начальник");
        }
    }
    catch (e) {
        console.error(e);

        const roleEl = document.getElementById("headerUserRole");
        const nameEl = document.getElementById("headerUserName");

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