requireRole(["WORKER"]);

let isCreating = false;

/* ===================== VALIDATION ===================== */

const CREATE_ORDER_VALIDATION_RULES = [
  {
    isInvalid: fields => !fields.serviceType,
    message: "Оберіть тип заявки."
  },
  {
    isInvalid: fields => !fields.descriptionProblem || fields.descriptionProblem.length < 5,
    message: "Опис проблеми має містити мінімум 5 символів."
  },
  {
    isInvalid: fields => Number.isNaN(fields.workshopNumber) || fields.workshopNumber < 0,
    message: "Некоректний номер цеху."
  },
  {
    isInvalid: fields => Number.isNaN(fields.floorNumber) || fields.floorNumber < 0,
    message: "Некоректний номер поверху."
  },
  {
    isInvalid: fields => Number.isNaN(fields.roomNumber) || fields.roomNumber < 0,
    message: "Некоректний номер кімнати."
  }
];

function getCreateOrderValidationError(fields) {
  const failedRule = CREATE_ORDER_VALIDATION_RULES.find(rule => rule.isInvalid(fields));
  return failedRule?.message || "";
}

function validateCreateOrderForm(showMessage = true) {
  const fields = createOrderUi.getFields();
  const error = getCreateOrderValidationError(fields);

  if (error) {
    createOrderUi.setButtonDisabled(true);

    if (showMessage) {
      createOrderUi.setMessage(error, "red");
    }

    return false;
  }

  if (!isCreating) {
    createOrderUi.setButtonDisabled(false);
  }

  if (showMessage) {
    createOrderUi.setMessage("");
  }

  return true;
}

/* ===================== HEADER / USER ===================== */

function getUserDisplayName(user) {
  return user?.fullName || user?.full_name || user?.login || "Користувач";
}

function getUserRole(user) {
  return user?.role || user?.roleInSystem || user?.role_in_system || "";
}

async function loadHeaderUser() {
  const nameEl = document.getElementById("headerUserName");
  const roleEl = document.getElementById("headerUserRole");

  try {
    const user = await apiRequest("/api/auth/me", {
      method: "GET"
    });

    if (nameEl) {
      nameEl.textContent = getUserDisplayName(user);
    }

    if (roleEl) {
      roleEl.textContent = formatRole(getUserRole(user));
    }
  } catch (e) {
    console.error("loadHeaderUser error:", e);

    if (nameEl) {
      nameEl.textContent = "Користувач";
    }

    if (roleEl) {
      roleEl.textContent = "";
    }
  }
}

async function loadCurrentWorkerData() {
  const result = await createOrderService.loadCurrentUser();

  if (!result.ok) {
    createOrderUi.setCreatedBy("Не вдалося завантажити користувача");
    createOrderUi.setMessage(result.error || "Помилка завантаження користувача", "red");
    validateCreateOrderForm(false);
    return;
  }

  const user = result.data;

  createOrderUi.setCreatedBy(
    `${getUserDisplayName(user)} (${formatRole(getUserRole(user))})`
  );

  createOrderUi.fillUserLocation(user);
  validateCreateOrderForm(false);
}

/* ===================== CREATE ORDER ===================== */

function setCreatingState(isActive) {
  isCreating = isActive;
  createOrderUi.setButtonDisabled(isActive);
  createOrderUi.setButtonText(isActive ? "Створення..." : "Створити заявку");
}

async function handleCreateOrder() {
  if (isCreating) {
    return;
  }

  if (!validateCreateOrderForm(true)) {
    return;
  }

  const orderData = createOrderUi.getFields();

  setCreatingState(true);
  createOrderUi.setMessage("Створення заявки...", "#ffffff");

  const result = await createOrderService.createOrder(orderData);

  if (!result.ok) {
    setCreatingState(false);
    createOrderUi.setMessage(result.error || "Не вдалося створити заявку", "red");
    validateCreateOrderForm(false);
    return;
  }

  createOrderUi.setMessage("");
  createOrderUi.hideCreateButton();

  createOrderUi.showSuccessModal(() => {
    window.location.href = "/workerPage.html";
  });
}

/* ===================== INIT ===================== */

function initCreateOrderPage() {
  createOrderUi.initCustomSelect(() => validateCreateOrderForm(false));
  createOrderUi.bindInputs(() => validateCreateOrderForm(false));
  createOrderUi.bindCreate(handleCreateOrder);

  validateCreateOrderForm(false);
  loadCurrentWorkerData();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadHeaderUser();
  initCreateOrderPage();
});