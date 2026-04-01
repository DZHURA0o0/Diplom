async function handleStart(orderId) {
  try {
    setPageStatus("Збереження...");
    await startSpecialistOrder(orderId);

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "IN_PROGRESS";
    }

    setPageStatus("Заявку переведено в статус 'У роботі'.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка старту: " + e.message, true);
  }
}

async function handleSaveInspection(orderId) {
  try {
    const input = document.getElementById(`inspection-${orderId}`);
    const inspectionResult = input?.value?.trim() ?? "";

    if (!inspectionResult) {
      setPageStatus("Введи результат огляду.", true);
      return;
    }

    setPageStatus("Збереження огляду...");
    await saveInspection(orderId, inspectionResult);

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "INSPECTION";
    }

    setPageStatus("Результат огляду збережено. Заявку переведено на етап перевірки.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка огляду: " + e.message, true);
  }
}

async function handleSendDetailRequest(orderId) {
  try {
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

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "WAITING_DETAILS";
    }

    setPageStatus("Запит на деталі відправлено.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка запиту деталей: " + e.message, true);
  }
}

async function handleMoveToExecution(orderId) {
  try {
    setPageStatus("Збереження...");
    await moveToExecution(orderId);

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "EXECUTION";
    }

    setPageStatus("Заявку переведено в статус 'На виконанні'.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка переходу: " + e.message, true);
  }
}

async function handleFinishOrder(orderId) {
  try {
    const input = document.getElementById(`work-report-${orderId}`);
    const workReport = input?.value?.trim() ?? "";

    if (!workReport) {
      setPageStatus("Введи звіт по роботі.", true);
      return;
    }

    setPageStatus("Збереження звіту...");
    await finishSpecialistOrder(orderId, workReport);

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "DONE";
    }

    setPageStatus("Заявку завершено.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка завершення: " + e.message, true);
  }
}

async function handleRework(orderId) {
  try {
    const input = document.getElementById(`rework-report-${orderId}`);
    const reportText = input?.value?.trim() ?? "";

    if (!reportText) {
      setPageStatus("Введи звіт для переробки.", true);
      return;
    }

    setPageStatus("Збереження повторного звіту...");
    await sendReworkReport(orderId, reportText);

    const filter = document.getElementById("statusFilter");
    if (filter) {
      filter.value = "DONE";
    }

    setPageStatus("Переробку завершено.");
    await loadOrders();
    openedOrderId = orderId;
    renderOrders(specialistOrders);
  } catch (e) {
    console.error(e);
    setPageStatus("Помилка переробки: " + e.message, true);
  }
}