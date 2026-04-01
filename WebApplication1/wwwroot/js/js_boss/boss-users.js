function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeUser(user) {
    return {
        id: user.id || user._id || "",
        fullName: user.fullName || user.full_name || "—",
        login: user.login || "—",
        role: user.role || user.roleInSystem || user.role_in_system || "—",
        position: user.position || "—",
        accountStatus: user.accountStatus || user.account_status || "—"
    };
}

function createUserCell(content, className = "") {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.innerHTML = content;
    return td;
}

function roleLabel(role) {
    const map = {
        WORKER: "Працівник",
        SPECIALIST: "Спеціаліст",
        BOSS: "Начальник"
    };
    return map[role] || role || "—";
}

function statusLabel(status) {
    const map = {
        ACTIVE: "Активний",
        INACTIVE: "Неактивний"
    };
    return map[status] || status || "—";
}

function buildRoleBadge(role) {
    return `<span class="status-badge">${escapeHtml(roleLabel(role))}</span>`;
}

function buildAccountBadge(status) {
    return `<span class="status-badge account-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

function setPendingButton(button, pendingText) {
    if (!button) return null;

    const original = button.textContent;
    button.disabled = true;
    button.textContent = pendingText;

    return () => {
        button.disabled = false;
        button.textContent = original;
    };
}

function buildUserRoleControl(user) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";

    const select = document.createElement("select");

    ["WORKER", "SPECIALIST", "BOSS"].forEach(role => {
        const option = new Option(roleLabel(role), role);
        if (user.role === role) option.selected = true;
        select.appendChild(option);
    });

    const button = document.createElement("button");
    button.className = "btn-main";
    button.textContent = "Зберегти";

    button.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            const newRole = select.value;

            if (newRole === user.role) {
                setStatus("Роль не змінена");
                return;
            }

            const restore = setPendingButton(button, "Збереження...");
            await updateUserRole(user.id, newRole);
            await loadUsers();
            setStatus("Роль оновлено");
            restore?.();
        }
        catch (e) {
            console.error(e);
            setStatus("Помилка зміни ролі: " + e.message, true);
        }
    });

    wrap.append(select, button);
    return wrap;
}

function buildUserStatusControl(user) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";

    const nextStatus = user.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const button = document.createElement("button");
    button.className = nextStatus === "ACTIVE" ? "btn-success" : "btn-danger";
    button.textContent = nextStatus === "ACTIVE" ? "Активувати" : "Деактивувати";

    button.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        try {
            const restore = setPendingButton(
                button,
                nextStatus === "ACTIVE" ? "Активація..." : "Деактивація..."
            );

            await updateUserAccountStatus(user.id, nextStatus);
            await loadUsers();
            setStatus("Статус оновлено");
            restore?.();
        }
        catch (e) {
            console.error(e);
            setStatus("Помилка зміни статусу: " + e.message, true);
        }
    });

    wrap.append(button);
    return wrap;
}

function buildUserRow(rawUser) {
    const user = normalizeUser(rawUser);
    const tr = document.createElement("tr");
    tr.className = "main-row";

    tr.appendChild(createUserCell(escapeHtml(user.id), "cell-mono"));
    tr.appendChild(createUserCell(escapeHtml(user.fullName)));
    tr.appendChild(createUserCell(escapeHtml(user.login)));
    tr.appendChild(createUserCell(buildRoleBadge(user.role)));
    tr.appendChild(createUserCell(escapeHtml(user.position)));
    tr.appendChild(createUserCell(buildAccountBadge(user.accountStatus)));

    const roleTd = document.createElement("td");
    roleTd.appendChild(buildUserRoleControl(user));
    tr.appendChild(roleTd);

    const statusTd = document.createElement("td");
    statusTd.appendChild(buildUserStatusControl(user));
    tr.appendChild(statusTd);

    return tr;
}

async function loadUsers() {
    if (typeof activeTab !== "undefined" && activeTab !== "users") return;

    try {
        setStatus("Завантаження користувачів...");

        const role = document.getElementById("roleFilter")?.value ?? "";
        const status = document.getElementById("accountStatusFilter")?.value ?? "";

        const users = await fetchUsers(role, status);

        const body = document.getElementById("users");
        if (!body) return;

        body.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            body.innerHTML = `<tr><td colspan="8"><div class="empty-box">Користувачів не знайдено</div></td></tr>`;
            setStatus("Користувачів не знайдено");
            return;
        }

        users
            .map(normalizeUser)
            .sort((a, b) => {
                const roleOrder = { BOSS: 1, SPECIALIST: 2, WORKER: 3 };
                const ra = roleOrder[a.role] ?? 999;
                const rb = roleOrder[b.role] ?? 999;

                if (ra !== rb) return ra - rb;

                return String(a.fullName).localeCompare(String(b.fullName), "uk");
            })
            .forEach(user => {
                body.appendChild(buildUserRow(user));
            });

        setStatus("Завантажено " + users.length + " користувачів");
    }
    catch (e) {
        console.error(e);

        const body = document.getElementById("users");
        if (body) {
            body.innerHTML = `<tr><td colspan="8"><div class="error-box">${escapeHtml(e.message || "Users load error")}</div></td></tr>`;
        }

        setStatus("Помилка завантаження користувачів: " + e.message, true);
    }
}