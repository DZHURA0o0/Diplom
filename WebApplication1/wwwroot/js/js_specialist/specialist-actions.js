function isCurrentFocusedOrder(orderId) {
  return focusedOrderId && String(focusedOrderId) === String(orderId);
}

function getCachedOrder(orderId) {
  return specialistOrders.find(x => getOrderId(x) === String(orderId));
}

function getCachedOrderStatus(orderId) {
  const order = getCachedOrder(orderId);
  return String(order?.status ?? "").trim().toUpperCase();
}

function requireFocusedWorkspace(orderId, actionText) {
  if (isCurrentFocusedOrder(orderId)) {
    return true;
  }

  setPageStatus(
    actionText || "Спочатку відкрий заявку в режимі обробки.",
    true
  );

  return false;
}

async function handleStart(orderId) {
  try {
    setPageStatus("Збереження...");
    await startSpecialistOrder(orderId);

    setPageStatus("Заявку переведено в статус 'У роботі'.");

    // Після старту заявки відкриваємо окремий простір тільки для неї
    await openOrderWorkspace(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка старту: " + e.message, true);
  }
}

async function handleSaveInspection(orderId) {
  try {
    if (!requireFocusedWorkspace(orderId, "Щоб зберегти огляд, відкрий заявку в режимі обробки.")) {
      return;
    }

    const input = document.getElementById(`inspection-${orderId}`);
    const inspectionResult = input?.value?.trim() ?? "";

    if (!inspectionResult) {
      setPageStatus("Введи результат огляду.", true);
      return;
    }

    setPageStatus("Збереження огляду...");
    await saveInspection(orderId, inspectionResult);

    setPageStatus("Результат огляду збережено. Заявку переведено на етап перевірки.");
    await refreshFocusedOrder(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка огляду: " + e.message, true);
  }
}

async function handleSendDetailRequest(orderId) {
  try {
    if (!requireFocusedWorkspace(orderId, "Щоб надіслати запит на деталі, відкрий заявку в режимі обробки.")) {
      return;
    }

    const status = getCachedOrderStatus(orderId);

    if (status === "WAITING_DETAILS") {
      setPageStatus("Запит на деталі вже відправлено. Дії заблоковано до отримання деталей.", true);
      return;
    }

    const detailNeeds = document.getElementById(`detail-needs-${orderId}`)?.value?.trim() ?? "";
    const explanation = document.getElementById(`detail-explanation-${orderId}`)?.value?.trim() ?? "";

    if (!detailNeeds) {
      setPageStatus("Вкажи потрібні деталі.", true);
      return;
    }

    if (!explanation) {
      setPageStatus("Вкажи пояснення.", true);
      return;
    }

    setPageStatus("Надсилання запиту на деталі...");
    await sendDetailRequest(orderId, detailNeeds, explanation);

    setPageStatus("Запит на деталі відправлено. Подальші дії заблоковано до отримання деталей.");
    await refreshFocusedOrder(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка запиту деталей: " + e.message, true);
  }
}

async function handleMoveToExecution(orderId) {
  try {
    if (!requireFocusedWorkspace(orderId, "Щоб перевести заявку до виконання, відкрий її в режимі обробки.")) {
      return;
    }

    const status = getCachedOrderStatus(orderId);

    if (status === "WAITING_DETAILS") {
      setPageStatus("Заявка очікує деталей. Перехід до виконання заблоковано.", true);
      return;
    }

    setPageStatus("Збереження...");
    await moveToExecution(orderId);

    setPageStatus("Заявку переведено в статус 'На виконанні'.");
    await refreshFocusedOrder(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка переходу: " + e.message, true);
  }
}

async function handleFinishOrder(orderId) {
  try {
    if (!requireFocusedWorkspace(orderId, "Щоб написати звіт, відкрий заявку в режимі обробки.")) {
      return;
    }

    const status = getCachedOrderStatus(orderId);

    if (status === "WAITING_DETAILS") {
      setPageStatus("Заявка очікує деталей. Звіт заблоковано до отримання деталей.", true);
      return;
    }

    const input = document.getElementById(`work-report-${orderId}`);
    const workReport = input?.value?.trim() ?? "";

    if (!workReport) {
      setPageStatus("Введи звіт по роботі.", true);
      return;
    }

    setPageStatus("Збереження звіту...");
    await finishSpecialistOrder(orderId, workReport);

    setPageStatus("Заявку завершено.");
    await refreshFocusedOrder(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка завершення: " + e.message, true);
  }
}

async function handleRework(orderId) {
  try {
    if (!requireFocusedWorkspace(orderId, "Щоб виконати переробку, відкрий заявку в режимі обробки.")) {
      return;
    }

    const input = document.getElementById(`rework-report-${orderId}`);
    const reportText = input?.value?.trim() ?? "";

    if (!reportText) {
      setPageStatus("Введи звіт для переробки.", true);
      return;
    }

    setPageStatus("Збереження повторного звіту...");
    await sendReworkReport(orderId, reportText);

    setPageStatus("Переробку завершено.");
    await refreshFocusedOrder(orderId);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка переробки: " + e.message, true);
  }
}