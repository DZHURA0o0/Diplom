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
  console.log("RAW RESPONSE:", text);

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchSpecialistOrders(status = "") {
  const url = status
    ? `${API}/api/specialist/orders?status=${encodeURIComponent(status)}`
    : `${API}/api/specialist/orders`;

  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await readResponse(response);
  console.log("GET /api/specialist/orders parsed:", data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? `Load error: ${response.status}`;

    console.error("GET /api/specialist/orders failed:", {
      status: response.status,
      data
    });

    throw new Error(message);
  }

  if (!Array.isArray(data)) {
    console.error("GET /api/specialist/orders wrong format:", data);
    throw new Error("Wrong response format");
  }

  return data;
}

async function fetchSpecialistOrderById(orderId) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await readResponse(response);
  console.log(`GET /api/specialist/orders/${orderId} parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? `Load error: ${response.status}`;

    console.error(`GET /api/specialist/orders/${orderId} failed:`, {
      status: response.status,
      data
    });

    throw new Error(message);
  }

  return data;
}

async function startSpecialistOrder(orderId) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}/start`, {
    method: "PATCH",
    headers: authHeaders()
  });

  const data = await readResponse(response);
  console.log(`PATCH /api/specialist/orders/${orderId}/start parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Start error";
    throw new Error(message);
  }

  return data;
}

async function saveInspection(orderId, inspectionResult) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}/inspection`, {
    method: "PATCH",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ inspectionResult })
  });

  const data = await readResponse(response);
  console.log(`PATCH /api/specialist/orders/${orderId}/inspection parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Inspection save error";
    throw new Error(message);
  }

  return data;
}

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
  console.log(`POST /api/specialist/orders/${orderId}/detail-request parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Detail request error";
    throw new Error(message);
  }

  return data;
}

async function moveToExecution(orderId) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}/execution`, {
    method: "PATCH",
    headers: authHeaders()
  });

  const data = await readResponse(response);
  console.log(`PATCH /api/specialist/orders/${orderId}/execution parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Execution transition error";
    throw new Error(message);
  }

  return data;
}

async function finishSpecialistOrder(orderId, workReport) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}/finish`, {
    method: "PATCH",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ workReport })
  });

  const data = await readResponse(response);
  console.log(`PATCH /api/specialist/orders/${orderId}/finish parsed:`, data);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Finish error";
    throw new Error(message);
  }

  return data;
}
async function sendReworkReport(orderId, reportText) {
  const response = await fetch(`${API}/api/specialist/orders/${orderId}/report`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      reportText,
      isRework: true
    })
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Rework error";
    throw new Error(message);
  }

  return data;
}
async function fetchOrderReports(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}/reports`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Reports load error";
    throw new Error(message);
  }

  return Array.isArray(data) ? data : [];
}
async function fetchOrderReports(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}/reports`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Reports load error";
    throw new Error(message);
  }

  return Array.isArray(data) ? data : [];
}async function fetchOrderReports(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}/reports`, {
    method: "GET",
    headers: authHeaders()
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message ?? "Reports load error";
    throw new Error(message);
  }

  return Array.isArray(data) ? data : [];
}