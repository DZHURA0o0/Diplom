function buildUserRoleControl(user) {
    const wrap = document.createElement("div");

    const select = document.createElement("select");

    ["WORKER", "SPECIALIST", "BOSS"].forEach(role => {
        const option = new Option(role, role);
        if (user.role === role) option.selected = true;
        select.appendChild(option);
    });

    const button = document.createElement("button");
    button.innerText = "Save";

    button.addEventListener("click", async function () {
        try {
            const newRole = select.value;

            if (newRole === user.role) {
                setStatus("Role was not changed");
                return;
            }

            await updateUserRole(user.id, newRole);
            await loadUsers();
            setStatus("Role updated");
        }
        catch (e) {
            console.error(e);
            setStatus("Role update error: " + e.message, true);
        }
    });

    wrap.append(select, document.createTextNode(" "), button);
    return wrap;
}

function buildUserStatusControl(user) {
    const button = document.createElement("button");

    const nextStatus = user.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    button.innerText = nextStatus === "ACTIVE" ? "Activate" : "Deactivate";

    button.addEventListener("click", async function () {
        try {
            await updateUserAccountStatus(user.id, nextStatus);
            await loadUsers();
            setStatus("Status updated");
        }
        catch (e) {
            console.error(e);
            setStatus("Status update error: " + e.message, true);
        }
    });

    return button;
}

function buildUserRow(user) {
    const tr = document.createElement("tr");

    tr.appendChild(createCell(user.id));
    tr.appendChild(createCell(user.fullName));
    tr.appendChild(createCell(user.login));
    tr.appendChild(createCell(user.role));
    tr.appendChild(createCell(user.position));
    tr.appendChild(createCell(user.accountStatus));

    const roleTd = document.createElement("td");
    roleTd.appendChild(buildUserRoleControl(user));
    tr.appendChild(roleTd);

    const statusTd = document.createElement("td");
    statusTd.appendChild(buildUserStatusControl(user));
    tr.appendChild(statusTd);

    return tr;
}

async function loadUsers() {
    if (activeTab !== "users") return;

    try {
        setStatus("Loading users...");

        const role = document.getElementById("roleFilter")?.value ?? "";
        const status = document.getElementById("accountStatusFilter")?.value ?? "";

        const users = await fetchUsers(role, status);

        const body = document.getElementById("users");
        if (!body) return;

        body.innerHTML = "";

        if (!Array.isArray(users) || users.length === 0) {
            setStatus("No users");
            return;
        }

        users.forEach(user => {
            body.appendChild(buildUserRow(user));
        });

        setStatus("Loaded " + users.length + " users");
    }
    catch (e) {
        console.error(e);
        setStatus("Users load error: " + e.message, true);
    }
}