/* ===================== SPECIALIST ACTION HELPERS ===================== */

function isCurrentFocusedOrder(orderId) {
  return focusedOrderId && String(focusedOrderId) === String(orderId);
}

function getCachedOrder(orderId) {
  const id = String(orderId);

  const fromVisibleOrders = Array.isArray(specialistOrders)
    ? specialistOrders.find(order => getOrderId(order) === id)
    : null;

  if (fromVisibleOrders) {
    return fromVisibleOrders;
  }

  return Array.isArray(specialistAllOrders)
    ? specialistAllOrders.find(order => getOrderId(order) === id)
    : null;
}

function getCachedOrderStatus(orderId) {
  const order = getCachedOrder(orderId);
  return String(order?.status ?? "").trim().toUpperCase();
}

function requireFocusedWorkspace(orderId, message) {
  if (isCurrentFocusedOrder(orderId)) {
    return true;
  }

  setPageStatus(
    message || "Спочатку відкрий заявку в режимі обробки.",
    true
  );

  return false;
}

function getActionInputValue(id) {
  const input = document.getElementById(id);
  return input?.value?.trim() ?? "";
}

function requireTextValue(value, message) {
  if (value) {
    return true;
  }

  setPageStatus(message, true);
  return false;
}

function canCreateDetailRequestByStatus(status) {
  const normalizedStatus = String(status ?? "").trim().toUpperCase();

  return [
    "INSPECTION",
    "WAITING_DETAILS",
    "DETAILS_RECEIVED"
  ].includes(normalizedStatus);
}

function isWaitingDetailsStatus(status) {
  return String(status ?? "").trim().toUpperCase() === "WAITING_DETAILS";
}

function isDetailsReceivedStatus(status) {
  return String(status ?? "").trim().toUpperCase() === "DETAILS_RECEIVED";
}

function getActionErrorMessage(error, fallback) {
  return error?.message || fallback || "Невідома помилка";
}

function hasActiveDetailRequests(order) {
  if (typeof getDetailRequests !== "function") {
    return false;
  }

  return getDetailRequests(order).some(request => {
    const status = String(request?.status ?? "").trim().toUpperCase();
    return status === "CREATED" || status === "WAITING" || status === "RESERVED";
  });
}

async function runSpecialistAction(config) {
  const {
    busyText = "Збереження...",
    successText = "Дію виконано.",
    errorPrefix = "Помилка",
    action,
    afterSuccess
  } = config;

  try {
    setPageStatus(busyText);

    const result = await action();

    setPageStatus(result?.message || successText);

    if (typeof afterSuccess === "function") {
      await afterSuccess(result);
    }

    return result;
  } catch (error) {
    console.error(error);
    setPageStatus(`${errorPrefix}: ${getActionErrorMessage(error)}`, true);
    return null;
  }
}

async function refreshOrderAfterAction(orderId) {
  await refreshFocusedOrder(orderId);
}

/* ===================== SPECIALIST ACTIONS ===================== */

async function handleStart(orderId) {
  if (!orderId) {
    setPageStatus("ID заявки не знайдено.", true);
    return;
  }

  await runSpecialistAction({
    busyText: "Початок роботи...",
    successText: "Заявку переведено в статус 'У роботі'.",
    errorPrefix: "Помилка старту",
    action: async () => {
      return await startSpecialistOrder(orderId);
    },
    afterSuccess: async () => {
      await openOrderWorkspace(orderId);
    }
  });
}

async function handleSaveInspection(orderId) {
  if (!requireFocusedWorkspace(orderId, "Щоб зберегти огляд, відкрий заявку в режимі обробки.")) {
    return;
  }

  const inspectionResult = getActionInputValue(`inspection-${orderId}`);

  if (!requireTextValue(inspectionResult, "Введи результат огляду.")) {
    return;
  }

  await runSpecialistAction({
    busyText: "Збереження огляду...",
    successText: "Результат огляду збережено. Заявку переведено на етап перевірки.",
    errorPrefix: "Помилка огляду",
    action: async () => {
      return await saveInspection(orderId, inspectionResult);
    },
    afterSuccess: async () => {
      await refreshOrderAfterAction(orderId);
    }
  });
}

async function handleSendDetailRequest(orderId) {
  if (!requireFocusedWorkspace(orderId, "Щоб надіслати запит на деталі, відкрий заявку в режимі обробки.")) {
    return;
  }

  const status = getCachedOrderStatus(orderId);

  if (!canCreateDetailRequestByStatus(status)) {
    setPageStatus("У поточному статусі заявки не можна створити запит на деталі.", true);
    return;
  }

  const detailNeeds = getActionInputValue(`detail-needs-${orderId}`);
  const explanation = getActionInputValue(`detail-explanation-${orderId}`);

  if (!requireTextValue(detailNeeds, "Вкажи потрібні деталі.")) {
    return;
  }

  if (!requireTextValue(explanation, "Вкажи пояснення.")) {
    return;
  }

  await runSpecialistAction({
    busyText: "Надсилання запиту на деталі...",
    successText: "Запит на деталі створено. Його додано в історію заявки.",
    errorPrefix: "Помилка запиту деталей",
    action: async () => {
      return await sendDetailRequest(orderId, detailNeeds, explanation);
    },
    afterSuccess: async () => {
      await refreshOrderAfterAction(orderId);
    }
  });
}

async function handleMoveToExecution(orderId) {
  if (!requireFocusedWorkspace(orderId, "Щоб перевести заявку до виконання, відкрий її в режимі обробки.")) {
    return;
  }

  const status = getCachedOrderStatus(orderId);

  if (isWaitingDetailsStatus(status) && hasActiveDetailRequests(getCachedOrder(orderId))) {
    setPageStatus("Заявка ще очікує деталей. Перехід до виконання заблоковано.", true);
    return;
  }

  await runSpecialistAction({
    busyText: "Переведення до виконання...",
    successText: "Заявку переведено в статус 'На виконанні'.",
    errorPrefix: "Помилка переходу",
    action: async () => {
      return await moveToExecution(orderId);
    },
    afterSuccess: async () => {
      await refreshOrderAfterAction(orderId);
    }
  });
}

async function handleFinishOrder(orderId) {
  if (!requireFocusedWorkspace(orderId, "Щоб написати звіт, відкрий заявку в режимі обробки.")) {
    return;
  }

  const status = getCachedOrderStatus(orderId);

  if (isWaitingDetailsStatus(status)) {
    setPageStatus("Заявка очікує деталей. Звіт заблоковано до отримання деталей.", true);
    return;
  }

  if (isDetailsReceivedStatus(status)) {
    setPageStatus("Спочатку переведи заявку до виконання.", true);
    return;
  }

  const workReport = getActionInputValue(`work-report-${orderId}`);

  if (!requireTextValue(workReport, "Введи звіт по роботі.")) {
    return;
  }

  await runSpecialistAction({
    busyText: "Збереження звіту...",
    successText: "Заявку завершено.",
    errorPrefix: "Помилка завершення",
    action: async () => {
      return await finishSpecialistOrder(orderId, workReport);
    },
    afterSuccess: async () => {
      await refreshOrderAfterAction(orderId);
    }
  });
}

async function handleRework(orderId) {
  if (!requireFocusedWorkspace(orderId, "Щоб виконати переробку, відкрий заявку в режимі обробки.")) {
    return;
  }

  const reportText = getActionInputValue(`rework-report-${orderId}`);

  if (!requireTextValue(reportText, "Введи звіт для переробки.")) {
    return;
  }

  await runSpecialistAction({
    busyText: "Збереження повторного звіту...",
    successText: "Перероблено. Заявку передано начальнику на перевірку.",
    errorPrefix: "Помилка переробки",
    action: async () => {
      return await sendReworkReport(orderId, reportText);
    },
    afterSuccess: async () => {
      await refreshOrderAfterAction(orderId);
    }
  });
}

/* ===================== GLOBAL EXPORTS FOR INLINE HTML HANDLERS ===================== */

window.handleStart = handleStart;
window.handleSaveInspection = handleSaveInspection;
window.handleSendDetailRequest = handleSendDetailRequest;
window.handleMoveToExecution = handleMoveToExecution;
window.handleFinishOrder = handleFinishOrder;
window.handleRework = handleRework;
