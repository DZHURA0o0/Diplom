async function fetchSpecialistOrders(status = "") {
  const url = status
    ? `/api/specialist/orders?status=${encodeURIComponent(status)}`
    : "/api/specialist/orders";

  const data = await apiRequest(url, {
    method: "GET"
  });

  if (!Array.isArray(data)) {
    throw new Error("Неправильний формат відповіді при завантаженні заявок.");
  }

  return data;
}

async function fetchSpecialistOrderById(orderId) {
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}`, {
    method: "GET"
  });
}

async function startSpecialistOrder(orderId) {
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/start`, {
    method: "PATCH"
  });
}

async function saveInspection(orderId, inspectionResult) {
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/inspection`, {
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
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/detail-request`, {
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
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/execution`, {
    method: "PATCH"
  });
}

async function finishSpecialistOrder(orderId, workReport) {
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/finish`, {
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
  return await apiRequest(`/api/specialist/orders/${encodeURIComponent(orderId)}/report`, {
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
  const data = await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/reports`, {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
}

async function fetchSpecialistAnalytics(from = "", to = "") {
  const params = new URLSearchParams();

  if (from) {
    params.append("from", from);
  }

  if (to) {
    params.append("to", to);
  }

  const query = params.toString();
  const url = query
    ? `/api/specialist/analytics?${query}`
    : "/api/specialist/analytics";

  return await apiRequest(url, {
    method: "GET"
  });
}