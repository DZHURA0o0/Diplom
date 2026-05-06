function renderOrders(data) {
  const container = document.getElementById("orders");
  if (!container) return;

  updateWorkspaceChrome();

  const isFocusMode = Boolean(focusedOrderId);

  let visibleData = Array.isArray(data) ? data : [];

  if (isFocusMode) {
    const focusedOrder = visibleData.find(o => getOrderId(o) === String(focusedOrderId));
    visibleData = focusedOrder ? [focusedOrder] : [];
  }

  if (!Array.isArray(visibleData) || visibleData.length === 0) {
    if (isFocusMode) {
      container.innerHTML = `<div class="empty">Заявку не знайдено.</div>`;
    } else {
      container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
      openedOrderId = null;
    }

    return;
  }

  let html = "";

  for (const o of visibleData) {
    const rawId = getOrderId(o);
    const safeId = escapeAttr(rawId);

    const isOpen = isFocusMode || openedOrderId === rawId;

    const statusRaw = String(o.status ?? "—");
    const statusText = escapeHtml(formatStatus(statusRaw));
    const statusClass = normalizeStatusClass(statusRaw);

    const workerName = escapeHtml(o.workerName ?? o.workerFullName ?? o.workerId ?? "—");
    const serviceType = escapeHtml(formatServiceType(o.serviceType));
    const descriptionProblem = escapeHtml(o.descriptionProblem ?? "—");
    const createdAt = formatDate(o.createdAt);
    const locationText = formatLocation(o);

    const rowClick = isFocusMode
      ? ""
      : `onclick="toggleDetails('${escapeJs(rawId)}')"`;

    html += `
      <div class="order-item ${isFocusMode ? "focused-order-item" : ""}">
        <div class="order-row ${isOpen ? "expanded" : ""}" ${rowClick}>
          <div class="col">
            <span class="status ${statusClass}">${statusText}</span>
          </div>

          <div class="col">
            <div class="value">${workerName}</div>
          </div>

          <div class="col">
            <div class="value">${serviceType}</div>
          </div>

          <div class="col">
            <div class="truncate" title="${descriptionProblem}">
              ${descriptionProblem}
            </div>
          </div>

          <div class="col">
            <div class="value">${locationText}</div>
          </div>

          <div class="col col-date">
            <div class="value">${createdAt}</div>
            <div class="arrow">${isFocusMode ? "" : (isOpen ? "▲" : "▼")}</div>
          </div>
        </div>

        <div id="details-${safeId}" class="order-details ${isOpen ? "" : "hidden"}"></div>
      </div>
    `;
  }

  container.innerHTML = html;

  for (const o of visibleData) {
    const rawId = getOrderId(o);
    const el = document.getElementById(`details-${rawId}`);

    if (el) {
      renderOrderDetails(o, el);
    }
  }
}

function renderOrderDetails(o, container) {
  const rawId = getOrderId(o);

  container.innerHTML = `
    <div class="details-card" onclick="event.stopPropagation()">
      <div class="details-grid">

        <div class="details-field">
          <div class="details-label">Статус</div>
          <div class="details-value">${escapeHtml(formatStatus(o.status))}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Тип послуги</div>
          <div class="details-value">${escapeHtml(formatServiceType(o.serviceType))}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Працівник</div>
          <div class="details-value">${escapeHtml(o.workerName ?? o.workerFullName ?? o.workerId ?? "—")}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Дата створення</div>
          <div class="details-value">${formatDate(o.createdAt)}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Локація</div>
          <div class="details-value">${formatLocation(o)}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Опис проблеми</div>
          <div class="details-value long-text">${escapeHtml(o.descriptionProblem ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Результат огляду</div>
          <div class="details-value long-text">${escapeHtml(o.inspectionResult ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Запит на деталі</div>
          <div class="details-value long-text">${escapeHtml(o.detailNeeds ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Пояснення до деталей</div>
          <div class="details-value long-text">${escapeHtml(o.detailExplanation ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Останній звіт</div>
          <div class="details-value long-text">${escapeHtml(o.workReport ?? o.workReportText ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Історія звітів</div>
          <div class="details-value">
            <div id="reports-history-${escapeAttr(rawId)}">Завантаження...</div>
          </div>
        </div>

        <div class="details-field full">
          <div class="details-label">Дії</div>
          <div class="details-value">
            ${renderActionBlock(o, rawId)}
          </div>
        </div>

      </div>
    </div>
  `;

  loadReportsHistory(rawId);
}

function renderInactiveActionBlock(orderId, status) {
  let text = "Щоб виконувати дії із заявкою, відкрий її в окремому режимі обробки.";

  if (status === "IN_PROGRESS") {
    text = "Щоб написати результат огляду, відкрий заявку в режимі обробки.";
  }

  if (status === "INSPECTION") {
    text = "Щоб надіслати запит на деталі або перейти до виконання, відкрий заявку в режимі обробки.";
  }

  if (status === "EXECUTION") {
    text = "Щоб написати фінальний звіт, відкрий заявку в режимі обробки.";
  }

  if (status === "REWORK") {
    text = "Щоб виконати переробку, відкрий заявку в режимі обробки.";
  }

  return `
    <div class="action-block inactive-action-block">
      <div class="inactive-title">Дії недоступні у списку</div>
      <div class="inactive-text">${escapeHtml(text)}</div>

      <div class="action-row">
        <button type="button" class="btn-action secondary" onclick="openOrderWorkspace('${escapeJs(orderId)}')">
          Відкрити обробку заявки
        </button>
      </div>
    </div>
  `;
}

function renderActionBlock(order, orderId) {
  const status = String(order.status ?? "").trim().toUpperCase();
  const isFocused = focusedOrderId && String(focusedOrderId) === String(orderId);

  const needsFocusedWorkspace = [
    "IN_PROGRESS",
    "INSPECTION",
    "EXECUTION",
    "REWORK"
  ].includes(status);

  if (!isFocused && needsFocusedWorkspace) {
    return renderInactiveActionBlock(orderId, status);
  }

  if (status === "ASSIGNED") {
    return `
      <div class="action-block">
        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleStart('${escapeJs(orderId)}')">
            Приступити до роботи
          </button>
        </div>
      </div>
    `;
  }

  if (status === "IN_PROGRESS") {
    return `
      <div class="action-block">
        <textarea
          id="inspection-${escapeAttr(orderId)}"
          class="action-textarea"
          placeholder="Введіть результат огляду..."
        >${escapeHtml(order.inspectionResult ?? "")}</textarea>

        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleSaveInspection('${escapeJs(orderId)}')">
            Зберегти огляд
          </button>
        </div>
      </div>
    `;
  }

  if (status === "INSPECTION") {
    return `
      <div class="action-block">
        <input
          id="detail-needs-${escapeAttr(orderId)}"
          class="action-input"
          type="text"
          placeholder="Які деталі потрібні">

        <textarea
          id="detail-explanation-${escapeAttr(orderId)}"
          class="action-textarea"
          placeholder="Пояснення до запиту на деталі..."></textarea>

        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleSendDetailRequest('${escapeJs(orderId)}')">
            Надіслати запит на деталі
          </button>

          <button type="button" class="btn-action secondary" onclick="handleMoveToExecution('${escapeJs(orderId)}')">
            Перевести до виконання
          </button>
        </div>
      </div>
    `;
  }

  if (status === "WAITING_DETAILS") {
    return `
      <div class="action-block locked-action-block">
        <div class="locked-title">Очікування деталей</div>

        <div class="locked-text">
          Запит на деталі вже відправлено. Подальша взаємодія із заявкою заблокована:
          неможливо перейти до виконання або написати звіт, поки статус заявки не буде змінено після отримання деталей.
        </div>
      </div>
    `;
  }

  if (status === "EXECUTION") {
    return `
      <div class="action-block">
        <textarea
          id="work-report-${escapeAttr(orderId)}"
          class="action-textarea"
          placeholder="Введіть звіт по виконаній роботі..."></textarea>

        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleFinishOrder('${escapeJs(orderId)}')">
            Завершити заявку
          </button>
        </div>
      </div>
    `;
  }

  if (status === "REWORK") {
    return `
      <div class="action-block">
        <div class="action-row">
          <span class="state-badge warning">Переробка</span>
        </div>

        <textarea
          id="rework-report-${escapeAttr(orderId)}"
          class="action-textarea"
          placeholder="Введіть звіт по переробці..."
        ></textarea>

        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleRework('${escapeJs(orderId)}')">
            Завершити переробку
          </button>
        </div>
      </div>
    `;
  }

  if (status === "DONE") {
    return `<span class="state-badge">Завершено</span>`;
  }

  if (status === "CANCELED") {
    return `<span class="state-badge">Скасовано</span>`;
  }

  return `<span class="state-badge">Немає доступних дій</span>`;
}

function renderReportsHistory(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return `<div class="details-value long-text">—</div>`;
  }

  return `
    <div class="reports-history">
      ${reports.map((report, index) => `
        <div class="report-history-item">
          <div class="report-history-head">
            <strong>Звіт ${index + 1}</strong>
            <span>${escapeHtml(formatDate(report.createdAt))}</span>
          </div>

          <div class="report-history-body">
            ${escapeHtml(report.reportText ?? "—")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function loadReportsHistory(orderId) {
  const target = document.getElementById(`reports-history-${orderId}`);
  if (!target) return;

  try {
    const reports = await fetchOrderReports(orderId);
    target.innerHTML = renderReportsHistory(reports);
  } catch (e) {
    console.error(e);
    target.innerHTML = `<div class="details-value long-text">Помилка завантаження</div>`;
  }
}