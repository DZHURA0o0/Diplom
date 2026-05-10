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

/* ===================== COMPLAINT ===================== */

function getComplaint(order) {
  return order?.complaint || order?.Complaint || null;
}

function getComplaintSubmitted(order) {
  const complaint = getComplaint(order);

  if (!complaint) {
    return Boolean(order?.complaintSubmitted ?? order?.ComplaintSubmitted ?? false);
  }

  return Boolean(
    complaint.isSubmitted ??
    complaint.is_submitted ??
    complaint.IsSubmitted ??
    order?.complaintSubmitted ??
    order?.ComplaintSubmitted ??
    false
  );
}

function getComplaintText(order) {
  const complaint = getComplaint(order);

  const text =
    complaint?.text ??
    complaint?.Text ??
    complaint?.complaintText ??
    complaint?.ComplaintText ??
    order?.complaintText ??
    order?.ComplaintText ??
    null;

  if (!text || !String(text).trim()) {
    return "—";
  }

  return String(text).trim();
}

function shouldShowComplaintBlock(order) {
  const status = String(order?.status ?? "").trim().toUpperCase();
  const complaintText = getComplaintText(order);

  return getComplaintSubmitted(order)
    || status === "UNDER_COMPLAINT"
    || status === "REWORK"
    || status === "REWORK_REVIEW"
    || (complaintText && complaintText !== "—");
}

function renderComplaintBlock(order) {
  if (!shouldShowComplaintBlock(order)) {
    return "";
  }

  return `
    <div class="details-field full specialist-complaint-field">
      <div class="details-label">Текст скарги</div>
      <div class="details-value long-text">${escapeHtml(getComplaintText(order))}</div>
    </div>
  `;
}

/* ===================== DETAIL REQUESTS HISTORY ===================== */

function getDetailRequests(order) {
  const direct = order?.detailRequests ?? order?.DetailRequests ?? [];

  if (Array.isArray(direct) && direct.length > 0) {
    return direct
      .map(normalizeDetailRequest)
      .filter(x => x.id || x.detailNeeds || x.explanation)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  const oldDetailNeeds = order?.detailNeeds ?? order?.DetailNeeds ?? "";
  const oldExplanation = order?.detailExplanation ?? order?.DetailExplanation ?? "";
  const oldStatus = order?.detailRequestStatus ?? order?.DetailRequestStatus ?? "";
  const oldId = order?.detailRequestId ?? order?.DetailRequestId ?? "";

  if (!oldDetailNeeds && !oldExplanation && !oldId) {
    return [];
  }

  return [
    {
      id: oldId,
      detailNeeds: oldDetailNeeds,
      explanation: oldExplanation,
      status: oldStatus,
      createdAt: null
    }
  ];
}

function normalizeDetailRequest(item) {
  item = item || {};

  return {
    id: item.id ?? item.Id ?? "",
    orderId: item.orderId ?? item.OrderId ?? "",
    specialistId: item.specialistId ?? item.SpecialistId ?? "",
    detailNeeds: item.detailNeeds ?? item.DetailNeeds ?? "",
    explanation: item.explanation ?? item.Explanation ?? "",
    status: item.status ?? item.Status ?? "",
    approvedBy: item.approvedBy ?? item.ApprovedBy ?? "",
    approvedAt: item.approvedAt ?? item.ApprovedAt ?? null,
    createdAt: item.createdAt ?? item.CreatedAt ?? null
  };
}

function formatDetailRequestStatus(status) {
  const key = String(status ?? "").trim().toUpperCase();

  const labels = {
    CREATED: "Очікує деталей",
    APPROVED: "Деталі отримано",
    REJECTED: "Відхилено",
    CANCELED: "Скасовано",
    WAITING: "Очікує деталей",
    RECEIVED: "Деталі отримано"
  };

  return labels[key] ?? (status || "—");
}

function normalizeDetailRequestStatusClass(status) {
  const key = String(status ?? "").trim().toUpperCase();

  if (key === "CREATED" || key === "WAITING") return "CREATED";
  if (key === "APPROVED" || key === "RECEIVED") return "APPROVED";
  if (key === "REJECTED") return "REJECTED";
  if (key === "CANCELED") return "CANCELED";

  return "UNKNOWN";
}

function renderDetailRequestsHistory(order) {
  const requests = getDetailRequests(order);

  if (requests.length === 0) {
    return `
      <div class="detail-request-empty">
        Запитів деталей ще немає.
      </div>
    `;
  }

  return `
    <div class="detail-request-history">
      ${requests.map((request, index) => {
        const statusClass = normalizeDetailRequestStatusClass(request.status);

        return `
          <div class="detail-request-item">
            <div class="detail-request-head">
              <div>
                <strong>Запит деталей ${requests.length - index}</strong>
                <span class="detail-request-date">${formatDate(request.createdAt)}</span>
              </div>

              <span class="detail-request-status ${statusClass}">
                ${escapeHtml(formatDetailRequestStatus(request.status))}
              </span>
            </div>

            <div class="detail-request-body">
              <div class="detail-request-row">
                <span>Потрібні деталі</span>
                <p>${escapeHtml(request.detailNeeds || "—")}</p>
              </div>

              <div class="detail-request-row">
                <span>Пояснення</span>
                <p>${escapeHtml(request.explanation || "—")}</p>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderDetailRequestForm(orderId, title = "Створити запит на деталі") {
  return `
    <div class="detail-request-form">
      <div class="detail-request-form-title">${escapeHtml(title)}</div>

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
      </div>
    </div>
  `;
}

/* ===================== ORDER DETAILS ===================== */

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

        ${renderComplaintBlock(o)}

        <div class="details-field full">
          <div class="details-label">Результат огляду</div>
          <div class="details-value long-text">${escapeHtml(o.inspectionResult ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Історія запитів деталей</div>
          <div class="details-value">
            ${renderDetailRequestsHistory(o)}
          </div>
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

/* ===================== ACTION BLOCKS ===================== */

function renderInactiveActionBlock(orderId, status) {
  let text = "Щоб виконувати дії із заявкою, відкрий її в окремому режимі обробки.";

  if (status === "IN_PROGRESS") {
    text = "Щоб написати результат огляду, відкрий заявку в режимі обробки.";
  }

  if (status === "INSPECTION") {
    text = "Щоб надіслати запит на деталі або перейти до виконання, відкрий заявку в режимі обробки.";
  }

  if (status === "WAITING_DETAILS") {
    text = "Заявка очікує деталей. Якщо потрібно додати ще один запит, відкрий заявку в режимі обробки.";
  }

  if (status === "DETAILS_RECEIVED") {
    text = "Щоб створити додатковий запит деталей або перейти до виконання, відкрий заявку в режимі обробки.";
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
    "WAITING_DETAILS",
    "DETAILS_RECEIVED",
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
        ${renderDetailRequestForm(orderId, "Створити запит на деталі")}

        <div class="action-row">
          <button type="button" class="btn-action secondary" onclick="handleMoveToExecution('${escapeJs(orderId)}')">
            Перевести до виконання без деталей
          </button>
        </div>
      </div>
    `;
  }

  if (status === "WAITING_DETAILS") {
    return `
      <div class="action-block">
        <div class="locked-action-block">
          <div class="locked-title">Очікування деталей</div>

          <div class="locked-text">
            У заявки є активний запит деталей. Якщо під час очікування стало зрозуміло,
            що потрібні ще додаткові деталі, можна створити ще один запит.
          </div>
        </div>

        ${renderDetailRequestForm(orderId, "Створити ще один запит деталей")}
      </div>
    `;
  }

  if (status === "DETAILS_RECEIVED") {
    return `
      <div class="action-block">
        <div class="action-row">
          <span class="state-badge">Деталі отримано</span>
        </div>

        <div class="inactive-text">
          Усі активні запити деталей отримані. Можна створити ще один запит деталей,
          якщо під час перевірки виявилась додаткова потреба, або перейти до виконання.
        </div>

        ${renderDetailRequestForm(orderId, "Створити додатковий запит деталей")}

        <div class="action-row execution-action-row">
          <button type="button" class="btn-action" onclick="handleMoveToExecution('${escapeJs(orderId)}')">
            Перевести до виконання
          </button>
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

  if (status === "REWORK_REVIEW") {
    return `
      <div class="action-block locked-action-block">
        <div class="locked-title">Переробку завершено</div>

        <div class="locked-text">
          Повторний звіт надіслано начальнику. Заявка очікує остаточного закриття начальником.
        </div>
      </div>
    `;
  }

  if (status === "UNDER_COMPLAINT") {
    return `
      <div class="action-block locked-action-block">
        <div class="locked-title">Заявка на оскарженні</div>

        <div class="locked-text">
          Працівник подав скаргу. Очікується рішення начальника.
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

/* ===================== REPORTS HISTORY ===================== */

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

/* ===================== SUB TABS: DETAIL REQUESTS ===================== */

let specialistDetailRequestFilter = "";

function setSpecialistDetailRequestFilter(status) {
  specialistDetailRequestFilter = String(status || "").trim().toUpperCase();

  document.querySelectorAll("[data-detail-request-filter]").forEach(button => {
    const value = String(button.dataset.detailRequestFilter || "").trim().toUpperCase();
    button.classList.toggle("active", value === specialistDetailRequestFilter);
  });

  renderSpecialistDetailRequestsTab();
}

function getSpecialistCachedOrders() {
  if (Array.isArray(specialistAllOrders) && specialistAllOrders.length > 0) {
    return specialistAllOrders;
  }

  return Array.isArray(specialistOrders) ? specialistOrders : [];
}

function getDetailRequestOrderInfo(order) {
  return {
    orderId: getOrderId(order),
    status: order.status || "—",
    workerName: order.workerName || order.workerFullName || order.workerId || "—",
    serviceType: order.serviceType || "—",
    descriptionProblem: order.descriptionProblem || "—",
    location: formatLocation(order),
    createdAt: order.createdAt
  };
}

function collectSpecialistDetailRequests() {
  const result = [];

  getSpecialistCachedOrders().forEach(order => {
    const orderInfo = getDetailRequestOrderInfo(order);
    const requests = getDetailRequests(order);

    requests.forEach(request => {
      result.push({
        ...request,
        order: orderInfo
      });
    });
  });

  return result.sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

function renderSpecialistDetailRequestsTab() {
  const container = document.getElementById("specialistDetailRequestsList");
  if (!container) return;

  let requests = collectSpecialistDetailRequests();

  if (specialistDetailRequestFilter) {
    requests = requests.filter(request => {
      const status = String(request.status || "").trim().toUpperCase();

      if (specialistDetailRequestFilter === "CREATED") {
        return status === "CREATED" || status === "WAITING";
      }

      if (specialistDetailRequestFilter === "APPROVED") {
        return status === "APPROVED" || status === "RECEIVED";
      }

      return status === specialistDetailRequestFilter;
    });
  }

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="specialist-subempty">
        Запитів деталей за вибраним фільтром немає.
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map(request => {
    const statusClass = normalizeDetailRequestStatusClass(request.status);
    const orderId = request.order.orderId;

    return `
      <div class="specialist-subitem">
        <div class="specialist-subitem-main">
          <div>
            <div class="specialist-subitem-title">
              ${escapeHtml(request.detailNeeds || "Запит деталей")}
            </div>

            <div class="specialist-subitem-meta">
              ${escapeHtml(formatDate(request.createdAt))}
              · ${escapeHtml(formatServiceType(request.order.serviceType))}
              · ${escapeHtml(request.order.location)}
            </div>
          </div>

          <span class="detail-request-status ${statusClass}">
            ${escapeHtml(formatDetailRequestStatus(request.status))}
          </span>
        </div>

        <div class="specialist-subitem-body">
          <div class="specialist-subfield">
            <span>Пояснення</span>
            <p>${escapeHtml(request.explanation || "—")}</p>
          </div>

          <div class="specialist-subfield">
            <span>Заявка</span>
            <p>${escapeHtml(request.order.descriptionProblem || "—")}</p>
          </div>
        </div>

        <div class="specialist-subitem-actions">
          <button type="button" class="btn-action secondary" onclick="openOrderWorkspace('${escapeJs(orderId)}')">
            Відкрити заявку
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* ===================== SUB TABS: REWORKS ===================== */

function collectSpecialistReworkOrders() {
  return getSpecialistCachedOrders()
    .filter(order => {
      const status = String(order.status || "").trim().toUpperCase();
      return status === "REWORK" || status === "REWORK_REVIEW";
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function renderSpecialistReworksTab() {
  const container = document.getElementById("specialistReworksList");
  if (!container) return;

  const orders = collectSpecialistReworkOrders();

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="specialist-subempty">
        Заявок на переробці немає.
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const orderId = getOrderId(order);
    const status = String(order.status || "").trim().toUpperCase();
    const statusClass = normalizeStatusClass(status);

    const complaintText = getComplaintText(order);

    return `
      <div class="specialist-subitem">
        <div class="specialist-subitem-main">
          <div>
            <div class="specialist-subitem-title">
              ${escapeHtml(formatServiceType(order.serviceType))}
            </div>

            <div class="specialist-subitem-meta">
              ${escapeHtml(formatDate(order.createdAt))}
              · ${escapeHtml(order.workerName || order.workerFullName || order.workerId || "—")}
              · ${formatLocation(order)}
            </div>
          </div>

          <span class="status ${statusClass}">
            ${escapeHtml(formatStatus(status))}
          </span>
        </div>

        <div class="specialist-subitem-body">
          <div class="specialist-subfield">
            <span>Опис проблеми</span>
            <p>${escapeHtml(order.descriptionProblem || "—")}</p>
          </div>

          <div class="specialist-subfield specialist-subfield-warning">
            <span>Текст скарги</span>
            <p>${escapeHtml(complaintText || "—")}</p>
          </div>
        </div>

        <div class="specialist-subitem-actions">
          <button type="button" class="btn-action secondary" onclick="openOrderWorkspace('${escapeJs(orderId)}')">
            Відкрити обробку заявки
          </button>
        </div>
      </div>
    `;
  }).join("");
}