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

function getApiErrorMessage(data, fallback) {
  if (typeof data === "string") return data;
  return data?.message ?? data?.error ?? fallback;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, `Помилка запиту: ${response.status}`));
  }

  return data;
}

async function fetchSpecialistOrders(status = "") {
  const url = status
    ? `/api/specialist/orders?status=${encodeURIComponent(status)}`
    : `/api/specialist/orders`;

  const data = await apiRequest(url, {
    method: "GET"
  });

  if (!Array.isArray(data)) {
    throw new Error("Неправильний формат відповіді при завантаженні заявок.");
  }

  return data;
}

async function fetchSpecialistOrderById(orderId) {
  return await apiRequest(`/api/specialist/orders/${orderId}`, {
    method: "GET"
  });
}

async function startSpecialistOrder(orderId) {
  return await apiRequest(`/api/specialist/orders/${orderId}/start`, {
    method: "PATCH"
  });
}

async function saveInspection(orderId, inspectionResult) {
  return await apiRequest(`/api/specialist/orders/${orderId}/inspection`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inspectionResult
    })
  });
}

async function sendDetailRequest(orderId, detailNeeds, explanation) {
  return await apiRequest(`/api/specialist/orders/${orderId}/detail-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      detailNeeds,
      explanation
    })
  });
}

async function moveToExecution(orderId) {
  return await apiRequest(`/api/specialist/orders/${orderId}/execution`, {
    method: "PATCH"
  });
}

async function finishSpecialistOrder(orderId, workReport) {
  return await apiRequest(`/api/specialist/orders/${orderId}/finish`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workReport
    })
  });
}

async function sendReworkReport(orderId, reportText) {
  return await apiRequest(`/api/specialist/orders/${orderId}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reportText,
      isRework: true
    })
  });
}

async function fetchOrderReports(orderId) {
  const data = await apiRequest(`/api/orders/${orderId}/reports`, {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
}