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

function showTab(tabName) {
    activeTab = tabName;

    const ordersTab = document.getElementById("ordersTab");
    const usersTab = document.getElementById("usersTab");
    const tabOrdersBtn = document.getElementById("tabOrdersBtn");
    const tabUsersBtn = document.getElementById("tabUsersBtn");

    if (tabName === "orders") {
        ordersTab?.classList.remove("hidden");
        usersTab?.classList.add("hidden");
        tabOrdersBtn?.classList.add("active");
        tabUsersBtn?.classList.remove("active");
        loadOrders();
    } else {
        usersTab?.classList.remove("hidden");
        ordersTab?.classList.add("hidden");
        tabUsersBtn?.classList.add("active");
        tabOrdersBtn?.classList.remove("active");
        loadUsers();
    }
}

async function loadHeaderUser() {
    try {
        const me = await fetchMe();

        const roleEl = document.getElementById("headerUserRole");
        const nameEl = document.getElementById("headerUserName");

        const role = me.role || me.roleInSystem || "BOSS";
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
    await loadHeaderUser();
    showTab("orders");
});