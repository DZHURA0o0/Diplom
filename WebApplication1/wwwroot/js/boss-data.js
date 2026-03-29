const API = "";

function token() {
    return localStorage.getItem("token");
}

function authHeaders(extra = {}) {
    return {
        ...extra,
        Authorization: "Bearer " + token()
    };
}

async function readResponse(response) {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function fetchWorkers() {
    const response = await fetch(API + "/api/boss/orders/workers", {
        method: "GET",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        throw new Error(typeof data === "string" ? data : "Workers load error");
    }

    return Array.isArray(data) ? data : [];
}

async function fetchSpecialists() {
    const response = await fetch(API + "/api/boss/orders/specialists", {
        method: "GET",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        throw new Error(typeof data === "string" ? data : "Specialists load error");
    }

    return Array.isArray(data) ? data : [];
}

async function fetchOrders(status = "") {
    const url = status
        ? `${API}/api/boss/orders?status=${encodeURIComponent(status)}`
        : `${API}/api/boss/orders`;

    const response = await fetch(url, {
        method: "GET",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? `Load error: ${response.status}`;
        throw new Error(message);
    }

    if (!Array.isArray(data)) {
        throw new Error("Wrong response format");
    }

    return data;
}

async function assignSpecialist(orderId, specialistId) {
    const response = await fetch(`${API}/api/boss/orders/${orderId}/assign-specialist`, {
        method: "PATCH",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            specialistId: specialistId || null
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Assign error";
        throw new Error(message);
    }

    return data;
}

async function fetchUsers(role = "", status = "") {
    const params = new URLSearchParams();

    if (role) {
        params.append("role", role);
    }

    if (status) {
        params.append("status", status);
    }

    const query = params.toString();
    const url = query
        ? `${API}/api/boss/users?${query}`
        : `${API}/api/boss/users`;

    const response = await fetch(url, {
        method: "GET",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? `Users load error: ${response.status}`;
        throw new Error(message);
    }

    if (!Array.isArray(data)) {
        throw new Error("Wrong users response format");
    }

    return data;
}

async function updateUserRole(userId, role) {
    const response = await fetch(`${API}/api/boss/users/${userId}/role`, {
        method: "PUT",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            role: role
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Role update error";
        throw new Error(message);
    }

    return data;
}

async function updateUserAccountStatus(userId, accountStatus) {
    const response = await fetch(`${API}/api/boss/users/${userId}/status`, {
        method: "PUT",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            accountStatus: accountStatus
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Status update error";
        throw new Error(message);
    }

    return data;
}