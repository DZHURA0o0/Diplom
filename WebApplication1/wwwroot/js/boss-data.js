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