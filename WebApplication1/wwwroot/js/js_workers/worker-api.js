function getToken() {
  return localStorage.getItem("token");
}

async function fetchMyOrders(status = "") {
  const token = getToken();

  if (!token) {
    window.location.href = "/";
    return null;
  }

  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  const res = await fetch(`/api/worker/orders${query}`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Error ${res.status}\n${text}`);
  }

  return JSON.parse(text);
}

async function fetchMyOrderById(orderId) {
  const token = getToken();

  if (!token) {
    window.location.href = "/";
    return null;
  }

  const res = await fetch(`/api/worker/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Error ${res.status}\n${text}`);
  }

  return JSON.parse(text);
}