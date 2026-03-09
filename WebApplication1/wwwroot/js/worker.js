requireRole(["WORKER"]);

async function loadOrders() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  const status = document.getElementById("status").value;

  let url = "/api/orders/my";
  if (status) url += "?status=" + encodeURIComponent(status);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const text = await res.text();

    if (!res.ok) {
      document.getElementById("orders").textContent =
        "Error " + res.status + "\n\n" + text;
      return;
    }

    try {
      const data = JSON.parse(text);
      document.getElementById("orders").textContent = JSON.stringify(data, null, 2);
    } catch {
      document.getElementById("orders").textContent = text;
    }
  } catch (e) {
    document.getElementById("orders").textContent = "Fetch failed:\n" + e;
  }
}