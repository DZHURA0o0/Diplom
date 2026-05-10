/* ===========================
   BOSS API
=========================== */

function ensureArrayResponse(data, errorMessage) {
  if (!Array.isArray(data)) {
    throw new Error(errorMessage);
  }

  return data;
}

/* ===========================
   ORDERS DATA
=========================== */

async function fetchWorkers() {
  const data = await apiRequest("/api/boss/orders/workers", {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
}

async function fetchSpecialists() {
  const data = await apiRequest("/api/boss/orders/specialists", {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
}

async function fetchOrders(status = "") {
  const url = status
    ? `/api/boss/orders?status=${encodeURIComponent(status)}`
    : "/api/boss/orders";

  const data = await apiRequest(url, {
    method: "GET"
  });

  return ensureArrayResponse(data, "Wrong response format");
}

async function fetchOrderDetails(orderId) {
  return await apiRequest(`/api/boss/orders/${encodeURIComponent(orderId)}/details`, {
    method: "GET"
  });
}

async function assignSpecialist(orderId, specialistId) {
  return await apiRequest(`/api/boss/orders/${encodeURIComponent(orderId)}/assign-specialist`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      specialistId: specialistId || null
    })
  });
}

/* ===========================
   СКАРГИ
=========================== */

async function moveComplaintToRework(orderId) {
  return await apiRequest(`/api/boss/complaints/${encodeURIComponent(orderId)}/to-rework`, {
    method: "PATCH"
  });
}

async function resolveComplaint(orderId, comment = "") {
  return await apiRequest(`/api/boss/complaints/${encodeURIComponent(orderId)}/resolve`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ comment })
  });
}

async function rejectComplaint(orderId, comment = "") {
  return await apiRequest(`/api/boss/complaints/${encodeURIComponent(orderId)}/reject`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ comment })
  });
}

/* ===========================
   USERS
=========================== */

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
    ? `/api/boss/users?${query}`
    : "/api/boss/users";

  const data = await apiRequest(url, {
    method: "GET"
  });

  return ensureArrayResponse(data, "Wrong users response format");
}

async function updateUserRole(userId, role) {
  return await apiRequest(`/api/boss/users/${encodeURIComponent(userId)}/role`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ role })
  });
}

async function updateUserAccountStatus(userId, accountStatus) {
  return await apiRequest(`/api/boss/users/${encodeURIComponent(userId)}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ accountStatus })
  });
}

/* ===========================
   CURRENT USER
=========================== */

async function fetchMe() {
  return await apiRequest("/api/auth/me", {
    method: "GET"
  });
}

/* ===========================
   REPORTS
=========================== */

async function fetchOrderReports(orderId) {
  const data = await apiRequest(`/api/orders/${encodeURIComponent(orderId)}/reports`, {
    method: "GET"
  });

  return Array.isArray(data) ? data : [];
}

/* ===========================
   ANALYTICS
=========================== */

async function fetchBossAnalytics(from = "", to = "", specialistId = "") {
  const params = new URLSearchParams();

  if (from) {
    params.append("from", from);
  }

  if (to) {
    params.append("to", to);
  }

  if (specialistId) {
    params.append("specialistId", specialistId);
  }

  const query = params.toString();
  const url = query
    ? `/api/boss/analytics?${query}`
    : "/api/boss/analytics";

  return await apiRequest(url, {
    method: "GET"
  });
}