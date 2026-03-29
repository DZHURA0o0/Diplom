let activeTab = "orders";

window.addEventListener("load", initBossPage);

async function initBossPage() {
    bindEvents();
    showTab("orders");
}

function bindEvents() {
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", loadOrders);
    }

    const roleFilter = document.getElementById("roleFilter");
    if (roleFilter) {
        roleFilter.addEventListener("change", loadUsers);
    }

    const accountStatusFilter = document.getElementById("accountStatusFilter");
    if (accountStatusFilter) {
        accountStatusFilter.addEventListener("change", loadUsers);
    }
}

function showTab(tabName) {
    activeTab = tabName;

    const ordersTab = document.getElementById("ordersTab");
    const usersTab = document.getElementById("usersTab");

    if (ordersTab) ordersTab.hidden = tabName !== "orders";
    if (usersTab) usersTab.hidden = tabName !== "users";

    setStatus("");

    if (tabName === "orders") {
        loadOrders();
    }

    if (tabName === "users") {
        loadUsers();
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
}

function setStatus(text, isError = false) {
    const el = document.getElementById("status");
    if (!el) return;

    el.innerText = text ?? "";
    el.style.color = isError ? "red" : "black";
}

function createCell(text) {
    const td = document.createElement("td");
    td.innerText = text ?? "";
    return td;
}