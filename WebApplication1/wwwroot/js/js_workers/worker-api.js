async function fetchMyOrders(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiRequest(`/api/worker/orders${query}`, {
    method: "GET"
  });

  if (!Array.isArray(data)) {
    throw new Error("Неправильний формат відповіді при завантаженні заявок.");
  }

  return data;
}

async function submitWorkerComplaint(orderId, text) {
  return await apiRequest(`/api/worker/orders/${encodeURIComponent(orderId)}/complaint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });
}