function renderOrders(data) {
  const container = document.getElementById("orders");

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
    openedOrderId = null;
    return;
  }

  let html = "";

  for (const o of data) {
    const rawId = getOrderId(o);
    const safeId = escapeAttr(rawId);
    const isOpen = openedOrderId === rawId;

    const statusRaw = String(o.status ?? "—");
    const statusText = escapeHtml(formatStatus(statusRaw));
    const statusClass = normalizeStatusClass(statusRaw);

    const workerName = escapeHtml(o.workerName ?? o.workerFullName ?? o.workerId ?? "—");
    const serviceType = escapeHtml(formatServiceType(o.serviceType));
    const descriptionProblem = escapeHtml(o.descriptionProblem ?? "—");
    const createdAt = formatDate(o.createdAt);
    const locationText = formatLocation(o);

    html += `
      <div class="order-item">
        <div class="order-row ${isOpen ? "expanded" : ""}" onclick="toggleDetails('${escapeJs(rawId)}')">
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
            <div class="arrow">${isOpen ? "▲" : "▼"}</div>
          </div>
        </div>

        <div id="details-${safeId}" class="order-details ${isOpen ? "" : "hidden"}"></div>
      </div>
    `;
  }

  container.innerHTML = html;

  for (const o of data) {
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

function renderActionBlock(order, orderId) {
  if (order.status === "ASSIGNED") {
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

  if (order.status === "IN_PROGRESS") {
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

  if (order.status === "INSPECTION") {
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

  if (order.status === "WAITING_DETAILS") {
    return `
      <div class="action-block">
        <div class="action-row">
          <button type="button" class="btn-action" onclick="handleMoveToExecution('${escapeJs(orderId)}')">
            Перевести до виконання
          </button>
        </div>
      </div>
    `;
  }

  if (order.status === "EXECUTION") {
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

  if (order.status === "REWORK") {
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

  if (order.status === "DONE") {
    return `<span class="state-badge">Завершено</span>`;
  }

  if (order.status === "CANCELED") {
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