const API = "";

// ===== Общие helpers для API =====

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

// ===== Получить свои заявки =====
async function fetchSpecialistOrders(status = "") {
    const url = status
        ? `${API}/api/specialist/orders?status=${encodeURIComponent(status)}`
        : `${API}/api/specialist/orders`;

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

// ===== Получить одну свою заявку =====
async function fetchSpecialistOrderById(orderId) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}`, {
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

    return data;
}

// ===== Приступить к работе =====
async function startSpecialistOrder(orderId) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}/start`, {
        method: "PATCH",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Start error";
        throw new Error(message);
    }

    return data;
}

// ===== Сохранить осмотр =====
async function saveInspection(orderId, inspectionResult) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}/inspection`, {
        method: "PATCH",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            inspectionResult
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Inspection save error";
        throw new Error(message);
    }

    return data;
}

// ===== Отправить запрос на деталь =====
async function sendDetailRequest(orderId, detailNeeds, explanation) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}/detail-request`, {
        method: "POST",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            detailNeeds,
            explanation
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Detail request error";
        throw new Error(message);
    }

    return data;
}

// ===== Перевести в EXECUTION =====
async function moveToExecution(orderId) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}/execution`, {
        method: "PATCH",
        headers: authHeaders()
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Execution transition error";
        throw new Error(message);
    }

    return data;
}

// ===== Завершить заявку =====
async function finishSpecialistOrder(orderId, workReport) {
    const response = await fetch(`${API}/api/specialist/orders/${orderId}/finish`, {
        method: "PATCH",
        headers: authHeaders({
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            workReport
        })
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message = typeof data === "string"
            ? data
            : data?.message ?? "Finish error";
        throw new Error(message);
    }

    return data;
}