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

    if (className) {
        td.className = className;
    }

    td.innerHTML = content;
    return td;
}

function buildRoleBadge(role) {
    return `<span class="status-badge">${escapeHtml(formatRole(role))}</span>`;
}

function buildAccountBadge(status) {
    return `<span class="status-badge account-${escapeHtml(status)}">${escapeHtml(formatAccountStatus(status))}</span>`;
}

function buildUserRoleControl(user) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";

    const select = document.createElement("select");

    ["WORKER", "SPECIALIST", "BOSS"].forEach(role => {
        const option = new Option(formatRole(role), role);

        if (user.role === role) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    const button = document.createElement("button");
    button.className = "btn-main";
    button.textContent = "Зберегти";

    button.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const newRole = select.value;

        if (newRole === user.role) {
            setStatus("Роль не змінена");
            return;
        }

        const restore = setPendingButton(button, "Збереження...");

        try {
            await updateUserRole(user.id, newRole);

            if (typeof resetBossPeopleCache === "function") {
                resetBossPeopleCache();
            }

            await loadUsers();
            setStatus("Роль оновлено");
        } catch (e) {
            console.error(e);
            setStatus("Помилка зміни ролі: " + e.message, true);
            restore?.();
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

        const restore = setPendingButton(
            button,
            nextStatus === "ACTIVE" ? "Активація..." : "Деактивація..."
        );

        try {
            await updateUserAccountStatus(user.id, nextStatus);

            if (typeof resetBossPeopleCache === "function") {
                resetBossPeopleCache();
            }

            await loadUsers();
            setStatus("Статус оновлено");
        } catch (e) {
            console.error(e);
            setStatus("Помилка зміни статусу: " + e.message, true);
            restore?.();
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

function sortUsers(users) {
    const roleOrder = {
        BOSS: 1,
        SPECIALIST: 2,
        WORKER: 3
    };

    return [...users].sort((a, b) => {
        const roleA = roleOrder[a.role] ?? 999;
        const roleB = roleOrder[b.role] ?? 999;

        if (roleA !== roleB) {
            return roleA - roleB;
        }

        return String(a.fullName).localeCompare(String(b.fullName), "uk");
    });
}

async function loadUsers() {
    if (typeof activeTab !== "undefined" && activeTab !== "users") return;

    const body = document.getElementById("users");

    try {
        setStatus("Завантаження користувачів...");

        const role = document.getElementById("roleFilter")?.value ?? "";
        const status = document.getElementById("accountStatusFilter")?.value ?? "";

        const users = await fetchUsers(role, status);

        if (!body) return;

        body.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            body.innerHTML = `<tr><td colspan="8"><div class="empty-box">Користувачів не знайдено</div></td></tr>`;
            setStatus("Користувачів не знайдено");
            return;
        }

        sortUsers(users.map(normalizeUser)).forEach(user => {
            body.appendChild(buildUserRow(user));
        });

        setStatus("Завантажено " + users.length + " користувачів");
    } catch (e) {
        console.error(e);

        if (body) {
            body.innerHTML = `<tr><td colspan="8"><div class="error-box">${escapeHtml(e.message || "Users load error")}</div></td></tr>`;
        }

        setStatus("Помилка завантаження користувачів: " + e.message, true);
    }
}