const createOrderService = (() => {
  async function loadCurrentUser() {
    try {
      const data = await apiRequest("/api/auth/me", {
        method: "GET"
      });

      return {
        ok: true,
        data
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message || "Failed to load current user"
      };
    }
  }

  async function createOrder(orderData) {
    try {
      await apiRequest("/api/worker/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceType: orderData.serviceType,
          descriptionProblem: orderData.descriptionProblem,
          workshopNumber: Number(orderData.workshopNumber),
          floorNumber: Number(orderData.floorNumber),
          roomNumber: Number(orderData.roomNumber)
        })
      });

      return {
        ok: true
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message || "Network error"
      };
    }
  }

  return {
    loadCurrentUser,
    createOrder
  };
})();