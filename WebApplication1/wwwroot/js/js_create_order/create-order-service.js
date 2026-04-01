const createOrderService = (() => {
  function getToken() {
    return localStorage.getItem("token");
  }

  async function loadCurrentUser() {
    const token = getToken();

    if (!token) {
      return {
        ok: false,
        error: "No token found"
      };
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!res.ok) {
        return {
          ok: false,
          error: "Failed to load current user: " + res.status
        };
      }

      const data = await res.json();

      return {
        ok: true,
        data
      };
    } catch {
      return {
        ok: false,
        error: "Failed to load current user"
      };
    }
  }

  async function createOrder(orderData) {
    const token = getToken();

    if (!token) {
      return {
        ok: false,
        error: "No token found"
      };
    }

    try {
      const res = await fetch("/api/worker/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          serviceType: orderData.serviceType,
          descriptionProblem: orderData.descriptionProblem,
          workshopNumber: Number(orderData.workshopNumber),
          floorNumber: Number(orderData.floorNumber),
          roomNumber: Number(orderData.roomNumber)
        })
      });

      let text = await res.text();

      try {
        const json = JSON.parse(text);
        text = json.message ?? text;
      } catch {}

      if (!res.ok) {
        return {
          ok: false,
          error: text || ("Error " + res.status)
        };
      }

      return {
        ok: true
      };
    } catch (e) {
      return {
        ok: false,
        error: "Network error: " + e
      };
    }
  }

  return {
    loadCurrentUser,
    createOrder
  };
})();