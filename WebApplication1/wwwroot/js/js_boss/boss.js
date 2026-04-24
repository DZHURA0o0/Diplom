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
}

function setActiveTabButton(tabName) {
    const tabOrdersBtn = document.getElementById("tabOrdersBtn");
    const tabComplaintsBtn = document.getElementById("tabComplaintsBtn");
    const tabUsersBtn = document.getElementById("tabUsersBtn");

    tabOrdersBtn?.classList.toggle("active", tabName === "orders");
    tabComplaintsBtn?.classList.toggle("active", tabName === "complaints");
    tabUsersBtn?.classList.toggle("active", tabName === "users");
}

function setVisibleTab(tabName) {
    const ordersTab = document.getElementById("ordersTab");
    const complaintsTab = document.getElementById("complaintsTab");
    const usersTab = document.getElementById("usersTab");

    ordersTab?.classList.toggle("hidden", tabName !== "orders");
    complaintsTab?.classList.toggle("hidden", tabName !== "complaints");
    usersTab?.classList.toggle("hidden", tabName !== "users");
}

function showTab(tabName) {
    activeTab = tabName;

    setVisibleTab(tabName);
    setActiveTabButton(tabName);

    if (tabName === "orders") {
        if (typeof loadOrders === "function") {
            loadOrders();
        }
        return;
    }

    if (tabName === "complaints") {
        if (typeof loadComplaintsOrders === "function") {
            loadComplaintsOrders();
        }
        return;
    }

    if (tabName === "users") {
        if (typeof loadUsers === "function") {
            loadUsers();
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
