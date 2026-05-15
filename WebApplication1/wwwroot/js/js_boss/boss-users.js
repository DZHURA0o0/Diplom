let bossUsersExpandedState = {};
let bossUsersEditState = {};

function normalizeUser(user) {
    return {
        id: user.id || user._id || "",
        fullName: user.fullName || user.full_name || "—",
        passNumber: user.passNumber ?? user.pass_number ?? 0,
        login: user.login || "—",
        role: user.role || user.roleInSystem || user.role_in_system || "—",
        position: user.position || "—",
        phone: user.phone || "—",
        email: user.email || "—",
        accountStatus: user.accountStatus || user.account_status || "—",
        floorNumber: user.floorNumber ?? user.floor_number ?? 0,
        officeNumber: user.officeNumber ?? user.office_number ?? 0,
        workshopNumber: user.workshopNumber ?? user.workshop_number ?? 0,
        createdAt: user.createdAt || user.created_at || ""
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
    const roleClassMap = {
        BOSS: "status-INSPECTION",
        SPECIALIST: "status-IN_PROGRESS",
        WORKER: "status-NEW",
        WAREHOUSE_MANAGER: "status-DETAILS_RECEIVED",
        WAREHOUSE_WORKER: "status-ASSIGNED"
    };

    const roleKey = String(role || "").trim().toUpperCase();
    const roleClass = roleClassMap[roleKey] || "status-ASSIGNED";

    return `<span class="status-badge ${escapeHtml(roleClass)}">${escapeHtml(formatRole(role))}</span>`;
}

function buildAccountBadge(status) {
    const statusKey = String(status || "").trim().toUpperCase();
    const statusClassMap = {
        ACTIVE: "account-ACTIVE",
        INACTIVE: "account-INACTIVE",
        REGISTRATION: "status-IN_PROGRESS"
    };
    const statusClass = statusClassMap[statusKey] || "status-ASSIGNED";

    return `<span class="status-badge ${escapeHtml(statusClass)}">${escapeHtml(formatAccountStatus(status))}</span>`;
}

function buildUserRoleControl(user) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";

    const select = document.createElement("select");

    ["WORKER", "WAREHOUSE_MANAGER", "WAREHOUSE_WORKER", "SPECIALIST", "BOSS"].forEach(role => {
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

function getUserEditButtonText(userId) {
    return bossUsersEditState[userId] ? "Оновити дані" : "Редагувати";
}

function buildExpandedUserControl(user, detailsRow) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";

    if (bossUsersEditState[user.id]) {
        wrap.innerHTML = `<span class="muted">Редагування</span>`;
        return wrap;
    }

    const button = document.createElement("button");
    button.className = "btn-main";
    button.textContent = getUserEditButtonText(user.id);

    button.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        bossUsersEditState[user.id] = true;
        fillUserDetailsRow(user, detailsRow);
        const rows = createUserRows(user);
        const mainRow = detailsRow.previousElementSibling;
        mainRow?.replaceWith(rows.mainRow);
        detailsRow.replaceWith(rows.detailsRow);
    });

    wrap.append(button);
    return wrap;
}

function userDetailValue(name, value, options = {}) {
    const editable = Boolean(options.editable);
    const type = options.type || "text";
    const inputValue = value === "—" ? "" : value;

    if (!editable) {
        return `
            <div class="order-detail-field">
                <div class="order-detail-label">${escapeHtml(name)}</div>
                <div class="order-detail-value">${escapeHtml(value || "—")}</div>
            </div>
        `;
    }

    return `
        <label class="order-detail-field">
            <div class="order-detail-label">${escapeHtml(name)}</div>
            <input
                class="boss-input user-details-input"
                type="${escapeHtml(type)}"
                data-field="${escapeHtml(options.field)}"
                value="${escapeHtml(inputValue)}"
            >
        </label>
    `;
}

function userDetailSelect(name, field, value, options) {
    const items = options || [];

    return `
        <label class="order-detail-field">
            <div class="order-detail-label">${escapeHtml(name)}</div>
            <select class="boss-select user-details-input" data-field="${escapeHtml(field)}">
                ${items.map(item => `
                    <option value="${escapeHtml(item.value)}" ${item.value === value ? "selected" : ""}>
                        ${escapeHtml(item.label)}
                    </option>
                `).join("")}
            </select>
        </label>
    `;
}

function buildUserDetailsHtml(user) {
    const editing = Boolean(bossUsersEditState[user.id]);

    if (!editing) {
        return `
            <div class="order-details-grid">
                ${userDetailValue("ID", user.id, { editable: false })}
                ${userDetailValue("ПІБ", user.fullName, { editable: false })}
                ${userDetailValue("Логін", user.login, { editable: false })}
                ${userDetailValue("Номер перепустки", user.passNumber, { editable: false })}
                ${userDetailValue("Роль", formatRole(user.role), { editable: false })}
                ${userDetailValue("Посада", user.position, { editable: false })}
                ${userDetailValue("Телефон", user.phone, { editable: false })}
                ${userDetailValue("Email", user.email, { editable: false })}
                ${userDetailValue("Статус акаунта", formatAccountStatus(user.accountStatus), { editable: false })}
                ${userDetailValue("Поверх", user.floorNumber, { editable: false })}
                ${userDetailValue("Кабінет", user.officeNumber, { editable: false })}
                ${userDetailValue("Цех", user.workshopNumber, { editable: false })}
                ${userDetailValue("Створено", user.createdAt ? formatDate(user.createdAt) : "—", { editable: false })}
            </div>
        `;
    }

    return `
        <div class="order-details-grid">
            ${userDetailValue("ID", user.id, { editable: false })}
            ${userDetailValue("ПІБ", user.fullName, { editable: true, field: "fullName" })}
            ${userDetailValue("Логін", user.login, { editable: true, field: "login" })}
            ${userDetailValue("Номер перепустки", user.passNumber, { editable: true, field: "passNumber", type: "number" })}
            ${userDetailSelect("Роль", "role", user.role, [
                { value: "WORKER", label: formatRole("WORKER") },
                { value: "WAREHOUSE_MANAGER", label: formatRole("WAREHOUSE_MANAGER") },
                { value: "WAREHOUSE_WORKER", label: formatRole("WAREHOUSE_WORKER") },
                { value: "SPECIALIST", label: formatRole("SPECIALIST") },
                { value: "BOSS", label: formatRole("BOSS") }
            ])}
            ${userDetailValue("Посада", user.position, { editable: true, field: "position" })}
            ${userDetailValue("Телефон", user.phone, { editable: true, field: "phone" })}
            ${userDetailValue("Email", user.email, { editable: true, field: "email", type: "email" })}
            ${userDetailSelect("Статус акаунта", "accountStatus", user.accountStatus, [
                { value: "ACTIVE", label: formatAccountStatus("ACTIVE") },
                { value: "REGISTRATION", label: formatAccountStatus("REGISTRATION") },
                { value: "INACTIVE", label: formatAccountStatus("INACTIVE") }
            ])}
            ${userDetailValue("Поверх", user.floorNumber, { editable: true, field: "floorNumber", type: "number" })}
            ${userDetailValue("Кабінет", user.officeNumber, { editable: true, field: "officeNumber", type: "number" })}
            ${userDetailValue("Цех", user.workshopNumber, { editable: true, field: "workshopNumber", type: "number" })}
            ${userDetailValue("Створено", user.createdAt ? formatDate(user.createdAt) : "—", { editable: false })}
        </div>
    `;
}

function buildUserPasswordHtml(user) {
    if (!bossUsersEditState[user.id]) {
        return "";
    }

    return `
        <div class="order-details-grid">
            <div class="order-detail-field full user-password-field">
                <div class="order-detail-label">Новий пароль</div>
                <div class="user-password-control">
                    <input
                        class="boss-input user-password-input"
                        type="password"
                        data-password-user-id="${escapeHtml(user.id)}"
                        placeholder="Введіть новий пароль"
                        autocomplete="new-password"
                    >
                    <button
                        type="button"
                        class="user-password-eye js-user-password-toggle"
                        title="Показати пароль"
                        aria-label="Показати пароль"
                    >&#128065;</button>
                </div>
                <div class="order-detail-label">Підтвердіть пароль</div>
                <div class="user-password-control">
                    <input
                        class="boss-input user-password-confirm-input"
                        type="password"
                        placeholder="Повторіть новий пароль"
                        autocomplete="new-password"
                    >
                </div>
                <div class="user-password-error hidden" data-user-password-error></div>
            </div>
        </div>
    `;
}

function buildUserDetailsActionsHtml(user) {
    if (!bossUsersEditState[user.id]) {
        return "";
    }

    return `
        <div class="user-details-actions">
            <button type="button" class="btn-success js-user-details-save">Оновити дані</button>
        </div>
    `;
}

function readUserDetailsForm(detailsRow) {
    const getValue = field => detailsRow.querySelector(`[data-field="${field}"]`)?.value?.trim() || "";
    const getNumber = field => Number(getValue(field) || 0);

    return {
        fullName: getValue("fullName"),
        login: getValue("login"),
        passNumber: getNumber("passNumber"),
        role: getValue("role"),
        position: getValue("position"),
        phone: getValue("phone"),
        email: getValue("email"),
        accountStatus: getValue("accountStatus"),
        floorNumber: getNumber("floorNumber"),
        officeNumber: getNumber("officeNumber"),
        workshopNumber: getNumber("workshopNumber")
    };
}

function fillUserDetailsRow(user, detailsRow) {
    detailsRow.innerHTML = `
        <td colspan="7">
            ${buildUserDetailsHtml(user)}
            ${buildUserPasswordHtml(user)}
            ${buildUserDetailsActionsHtml(user)}
        </td>
    `;

    attachUserPasswordHandlers(user, detailsRow);
    attachUserDetailsSaveHandler(user, detailsRow);
}

function attachUserDetailsSaveHandler(user, detailsRow) {
    const saveButton = detailsRow.querySelector(".js-user-details-save");

    if (!saveButton) {
        return;
    }

    saveButton.addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();

        const payload = readUserDetailsForm(detailsRow);
        const restore = setPendingButton(saveButton, "Оновлення...");

        try {
            await updateUserDetails(user.id, payload);
            await saveUserPasswordIfNeeded(user, detailsRow);

            delete bossUsersEditState[user.id];

            if (typeof resetBossPeopleCache === "function") {
                resetBossPeopleCache();
            }

            await loadUsers();
            setStatus("Дані користувача оновлено");
        } catch (e) {
            console.error(e);
            if (e.message !== "PASSWORD_VALIDATION") {
                setStatus("Помилка оновлення даних: " + e.message, true);
            }
            restore?.();
        }
    });
}

function attachUserPasswordHandlers(user, detailsRow) {
    const passwordInputs = [
        ...detailsRow.querySelectorAll(".user-password-input, .user-password-confirm-input")
    ];

    detailsRow.querySelectorAll(".js-user-password-toggle").forEach(toggle => {
        toggle.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();

            const input = toggle.parentElement?.querySelector("input");
            if (!input) return;

            const nextType = input.type === "password" ? "text" : "password";
            input.type = nextType;
            const label = nextType === "password" ? "Показати пароль" : "Сховати пароль";
            toggle.title = label;
            toggle.setAttribute("aria-label", label);
        });
    });

    passwordInputs.forEach(input => {
        input.addEventListener("click", e => e.stopPropagation());
        input.addEventListener("input", e => e.stopPropagation());
    });
}

async function saveUserPasswordIfNeeded(user, detailsRow) {
    const input = detailsRow.querySelector(".user-password-input");
    const confirmInput = detailsRow.querySelector(".user-password-confirm-input");
    const errorEl = detailsRow.querySelector("[data-user-password-error]");

    const password = input?.value || "";
    const confirmPassword = confirmInput?.value || "";

    setUserPasswordError(errorEl, "");

    if (!password && !confirmPassword) {
        return;
    }

    if (password.trim().length < 4) {
        setUserPasswordError(errorEl, "Пароль має містити мінімум 4 символи");
        throw new Error("PASSWORD_VALIDATION");
    }

    if (password !== confirmPassword) {
        setUserPasswordError(errorEl, "Паролі не співпадають");
        throw new Error("PASSWORD_VALIDATION");
    }

    await updateUserPassword(user.id, password);
}

function setUserPasswordError(errorEl, message) {
    if (!errorEl) {
        return;
    }

    errorEl.textContent = message || "";
    errorEl.classList.toggle("hidden", !message);
}

function createUserRows(rawUser) {
    const user = normalizeUser(rawUser);
    const isExpanded = Boolean(bossUsersExpandedState[user.id]);

    const mainRow = document.createElement("tr");
    mainRow.className = "main-row";
    mainRow.dataset.userId = user.id;

    if (isExpanded) {
        mainRow.classList.add("is-open");
    }

    mainRow.appendChild(createUserCell(`
        ${escapeHtml(user.fullName)}
        <span class="expand-mark">⌄</span>
    `));
    mainRow.appendChild(createUserCell(escapeHtml(user.login)));
    mainRow.appendChild(createUserCell(buildRoleBadge(user.role)));
    mainRow.appendChild(createUserCell(escapeHtml(user.position)));
    mainRow.appendChild(createUserCell(buildAccountBadge(user.accountStatus)));

    const roleTd = document.createElement("td");
    roleTd.appendChild(buildUserRoleControl(user));
    mainRow.appendChild(roleTd);

    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    detailsRow.dataset.userId = user.id;

    if (!isExpanded) {
        detailsRow.classList.add("hidden");
    }

    fillUserDetailsRow(user, detailsRow);

    const statusTd = document.createElement("td");
    statusTd.appendChild(
        isExpanded
            ? buildExpandedUserControl(user, detailsRow)
            : buildUserStatusControl(user)
    );
    mainRow.appendChild(statusTd);

    mainRow.addEventListener("click", e => {
        if (e.target.closest("button, select, input, textarea, a")) {
            return;
        }

        const willOpen = detailsRow.classList.contains("hidden");

        if (willOpen) {
            bossUsersExpandedState[user.id] = true;
            detailsRow.classList.remove("hidden");
            mainRow.classList.add("is-open");
        } else {
            delete bossUsersExpandedState[user.id];
            delete bossUsersEditState[user.id];
            detailsRow.classList.add("hidden");
            mainRow.classList.remove("is-open");
        }

        const body = document.getElementById("users");
        if (!body) return;

        const rows = createUserRows(user);
        mainRow.replaceWith(rows.mainRow);
        detailsRow.replaceWith(rows.detailsRow);
    });

    return {
        mainRow,
        detailsRow
    };
}

function sortUsers(users) {
    const roleOrder = {
        BOSS: 1,
        SPECIALIST: 2,
        WORKER: 3,
        WAREHOUSE_MANAGER: 4,
        WAREHOUSE_WORKER: 5
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
        await updateRegistrationsBadge();

        if (!body) return;

        body.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            body.innerHTML = `<tr><td colspan="7"><div class="empty-box">Користувачів не знайдено</div></td></tr>`;
            setStatus("Користувачів не знайдено");
            return;
        }

        sortUsers(users.map(normalizeUser)).forEach(user => {
            const rows = createUserRows(user);
            body.append(rows.mainRow, rows.detailsRow);
        });

        setStatus("Завантажено " + users.length + " користувачів");
    } catch (e) {
        console.error(e);

        if (body) {
            body.innerHTML = `<tr><td colspan="7"><div class="error-box">${escapeHtml(e.message || "Users load error")}</div></td></tr>`;
        }

        setStatus("Помилка завантаження користувачів: " + e.message, true);
    }
}

async function updateRegistrationsBadge() {
    const badge = document.getElementById("registrationsBadge");
    const tabUsersBtn = document.getElementById("tabUsersBtn");

    if (!badge) {
        return;
    }

    try {
        const users = await fetchUsers("", "REGISTRATION");
        const count = Array.isArray(users) ? users.length : 0;

        badge.textContent = String(count);

        if (count > 0) {
            badge.classList.remove("hidden");
            badge.title = `Акаунтів на реєстрації: ${count}`;
            tabUsersBtn?.classList.add("has-alerts");
        } else {
            badge.classList.add("hidden");
            badge.title = "";
            tabUsersBtn?.classList.remove("has-alerts");
        }
    } catch (e) {
        console.error(e);
        badge.classList.add("hidden");
        badge.title = "";
        tabUsersBtn?.classList.remove("has-alerts");
    }
}
