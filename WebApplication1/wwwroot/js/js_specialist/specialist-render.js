/* ===================== SPECIALIST RENDER HELPERS ===================== */

const SPECIALIST_DETAIL_REQUEST_STATUS_LABELS = {
  CREATED: "Надіслано",
  WAITING: "Готова до видачі",
  RESERVED: "Готова до видачі",
  APPROVED: "Видано",
  CANCELED: "Скасовано"
};

let specialistDetailRequestFilter = "";

function getWorkerDisplayName(order) {
  return order?.workerName || order?.workerFullName || order?.workerId || "—";
}

function getOrderServiceType(order) {
  return order?.serviceType || order?.service_type || "—";
}

function getOrderDescription(order) {
  return order?.descriptionProblem || order?.description_problem || "—";
}

function getOrderCreatedAt(order) {
  return order?.createdAt || order?.created_at || null;
}

function isFocusedOrder(orderId) {
  return Boolean(focusedOrderId) && String(focusedOrderId) === String(orderId);
}

function normalizeStatus(status) {
  return String(status ?? "").trim().toUpperCase();
}

function createDetailsField(label, value, options = {}) {
  const fullClass = options.full ? " full" : "";
  const valueClass = options.valueClass ? ` ${options.valueClass}` : "";
  const safeValue = value === null || value === undefined || value === "" ? "—" : value;

  return `
    <div class="details-field${fullClass}">
      <div class="details-label">${escapeHtml(label)}</div>
      <div class="details-value${valueClass}">${safeValue}</div>
    </div>
  `;
}

function createActionButton(label, handlerName, orderId, className = "btn-action") {
  return `
    <button type="button" class="${escapeAttr(className)}" onclick="${handlerName}('${escapeJs(orderId)}')">
      ${escapeHtml(label)}
    </button>
  `;
}

/* ===================== MAIN ORDERS LIST ===================== */

function getVisibleSpecialistOrders(data) {
  const visibleData = Array.isArray(data) ? data : [];

  if (!focusedOrderId) {
    return visibleData;
  }

  const focusedOrder = visibleData.find(order => getOrderId(order) === String(focusedOrderId));
  return focusedOrder ? [focusedOrder] : [];
}

function renderOrderRow(order, isFocusMode) {
  const orderId = getOrderId(order);
  const safeId = escapeAttr(orderId);
  const isOpen = isFocusMode || openedOrderId === orderId;

  const status = normalizeStatus(order.status || "—");
  const rowClick = isFocusMode ? "" : `onclick="toggleDetails('${escapeJs(orderId)}')"`;

  return `
    <div class="order-item ${isFocusMode ? "focused-order-item" : ""}">
      <div class="order-row ${isOpen ? "expanded" : ""}" ${rowClick}>
        <div class="col">
          <span class="status ${escapeAttr(normalizeStatusClass(status))}">
            ${escapeHtml(formatStatus(status))}
          </span>
        </div>

        <div class="col">
          <div class="value">${escapeHtml(getWorkerDisplayName(order))}</div>
        </div>

        <div class="col">
          <div class="value">${escapeHtml(formatServiceType(getOrderServiceType(order)))}</div>
        </div>

        <div class="col">
          <div class="truncate" title="${escapeAttr(getOrderDescription(order))}">
            ${escapeHtml(getOrderDescription(order))}
          </div>
        </div>

        <div class="col">
          <div class="value">${formatLocation(order)}</div>
        </div>

        <div class="col col-date">
          <div class="value">${formatDate(getOrderCreatedAt(order))}</div>
          <div class="arrow">${isFocusMode ? "" : (isOpen ? "▲" : "▼")}</div>
        </div>
      </div>

      <div id="details-${safeId}" class="order-details ${isOpen ? "" : "hidden"}"></div>
    </div>
  `;
}

function renderOrders(data) {
  const container = document.getElementById("orders");
  if (!container) return;

  if (typeof updateWorkspaceChrome === "function") {
    updateWorkspaceChrome();
  }

  const isFocusMode = Boolean(focusedOrderId);
  const visibleData = getVisibleSpecialistOrders(data);

  if (visibleData.length === 0) {
    container.innerHTML = isFocusMode
      ? `<div class="empty">Заявку не знайдено.</div>`
      : `<div class="empty">Заявок не знайдено.</div>`;

    if (!isFocusMode) {
      openedOrderId = null;
    }

    return;
  }

  container.innerHTML = visibleData
    .map(order => renderOrderRow(order, isFocusMode))
    .join("");

  visibleData.forEach(order => {
    const orderId = getOrderId(order);
    const details = document.getElementById(`details-${orderId}`);

    if (details && (isFocusMode || openedOrderId === orderId)) {
      renderOrderDetails(order, details);
    }
  });
}

/* ===================== POINT DETAILS TOGGLE ===================== */

function findSpecialistOrderById(orderId) {
  const id = String(orderId);

  const visibleOrder = Array.isArray(specialistOrders)
    ? specialistOrders.find(order => getOrderId(order) === id)
    : null;

  if (visibleOrder) {
    return visibleOrder;
  }

  return Array.isArray(specialistAllOrders)
    ? specialistAllOrders.find(order => getOrderId(order) === id)
    : null;
}

function getSpecialistDetailsElements(orderId) {
  const details = document.getElementById(`details-${orderId}`);

  if (!details) {
    return {
      item: null,
      row: null,
      details: null,
      arrow: null
    };
  }

  const item = details.closest(".order-item");
  const row = item?.querySelector(".order-row") || null;
  const arrow = row?.querySelector(".arrow") || null;

  return {
    item,
    row,
    details,
    arrow
  };
}

function setSpecialistOrderDetailsOpen(orderId, shouldOpen) {
  const id = String(orderId);
  const order = findSpecialistOrderById(id);
  const { row, details, arrow } = getSpecialistDetailsElements(id);

  if (!order || !details || !row) {
    return false;
  }

  if (shouldOpen) {
    openedOrderId = id;

    details.classList.remove("hidden");
    row.classList.add("expanded");

    if (arrow) {
      arrow.textContent = "▲";
    }

    renderOrderDetails(order, details);
    return true;
  }

  if (openedOrderId === id) {
    openedOrderId = null;
  }

  details.classList.add("hidden");
  row.classList.remove("expanded");

  if (arrow) {
    arrow.textContent = "▼";
  }

  return true;
}

function toggleSpecialistOrderDetailsOnly(orderId) {
  if (!orderId) {
    return;
  }

  if (focusedOrderId) {
    return;
  }

  const id = String(orderId);
  const { details } = getSpecialistDetailsElements(id);

  if (!details) {
    return;
  }

  const shouldOpen = details.classList.contains("hidden");

  if (openedOrderId && openedOrderId !== id) {
    setSpecialistOrderDetailsOpen(openedOrderId, false);
  }

  setSpecialistOrderDetailsOpen(id, shouldOpen);
}

/* ===================== POINT ORDER UPDATE ===================== */

function replaceSpecialistRenderedOrder(order) {
  const orderId = getOrderId(order);

  if (!orderId) {
    return false;
  }

  const oldDetails = document.getElementById(`details-${orderId}`);

  if (!oldDetails) {
    return false;
  }

  const oldItem = oldDetails.closest(".order-item");

  if (!oldItem) {
    return false;
  }

  const isFocusMode = Boolean(focusedOrderId);
  const wasOpen = isFocusMode || !oldDetails.classList.contains("hidden");

  if (wasOpen) {
    openedOrderId = orderId;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderOrderRow(order, isFocusMode).trim();

  const newItem = wrapper.firstElementChild;

  if (!newItem) {
    return false;
  }

  oldItem.replaceWith(newItem);

  const newDetails = document.getElementById(`details-${orderId}`);

  if (newDetails && wasOpen) {
    newDetails.classList.remove("hidden");
    renderOrderDetails(order, newDetails);
  }

  return true;
}

function removeSpecialistRenderedOrder(orderId) {
  const details = document.getElementById(`details-${orderId}`);

  if (!details) {
    return false;
  }

  const item = details.closest(".order-item");

  if (!item) {
    return false;
  }

  item.remove();

  const container = document.getElementById("orders");

  if (container && !container.querySelector(".order-item")) {
    container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
  }

  if (openedOrderId === String(orderId)) {
    openedOrderId = null;
  }

  return true;
}

/* ===================== COMPLAINTS ===================== */

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
    "";

  const normalizedText = String(text || "").trim();
  return normalizedText || "—";
}

function shouldShowComplaintBlock(order) {
  const status = normalizeStatus(order?.status);
  const complaintText = getComplaintText(order);

  return getComplaintSubmitted(order) ||
    status === "UNDER_COMPLAINT" ||
    status === "REWORK" ||
    status === "REWORK_REVIEW" ||
    complaintText !== "—";
}

function renderComplaintBlock(order) {
  if (!shouldShowComplaintBlock(order)) {
    return "";
  }

  return createDetailsField(
    "Текст скарги",
    escapeHtml(getComplaintText(order)),
    { full: true, valueClass: "long-text" }
  );
}

/* ===================== DETAIL REQUESTS ===================== */

function normalizeDetailRequest(item = {}) {
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

function getDetailRequests(order) {
  const direct = order?.detailRequests ?? order?.DetailRequests ?? [];

  if (Array.isArray(direct) && direct.length > 0) {
    return direct
      .map(normalizeDetailRequest)
      .filter(request => request.id || request.detailNeeds || request.explanation)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  const detailNeeds = order?.detailNeeds ?? order?.DetailNeeds ?? "";
  const explanation = order?.detailExplanation ?? order?.DetailExplanation ?? "";
  const status = order?.detailRequestStatus ?? order?.DetailRequestStatus ?? "";
  const id = order?.detailRequestId ?? order?.DetailRequestId ?? "";

  if (!detailNeeds && !explanation && !id) {
    return [];
  }

  return [
    normalizeDetailRequest({
      id,
      detailNeeds,
      explanation,
      status,
      createdAt: null
    })
  ];
}

function formatDetailRequestStatus(status) {
  const key = normalizeDetailRequestStatus(status);
  return SPECIALIST_DETAIL_REQUEST_STATUS_LABELS[key] ?? (status || "—");
}

function normalizeDetailRequestStatus(status) {
  const key = normalizeStatus(status);
  if (key === "REJECTED") return "CANCELED";
  if (key === "RESERVED") return "WAITING";
  return key;
}

function normalizeDetailRequestStatusClass(status) {
  const key = normalizeDetailRequestStatus(status);

  if (key === "CREATED") return "CREATED";
  if (key === "WAITING") return "WAITING";
  if (key === "APPROVED") return "APPROVED";
  if (key === "CANCELED") return "CANCELED";

  return "UNKNOWN";
}

function renderDetailRequestItem(request, index, total) {
  const statusClass = normalizeDetailRequestStatusClass(request.status);

  return `
    <div class="detail-request-item">
      <div class="detail-request-head">
        <div>
          <strong>Запит деталей ${total - index}</strong>
          <span class="detail-request-date">${formatDate(request.createdAt)}</span>
        </div>

        <span class="detail-request-status ${escapeAttr(statusClass)}">
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
}

function renderDetailRequestsHistory(order) {
  const requests = getDetailRequests(order);

  if (requests.length === 0) {
    return `<div class="detail-request-empty">Запитів деталей ще немає.</div>`;
  }

  return `
    <div class="detail-request-history">
      ${requests.map((request, index) => renderDetailRequestItem(request, index, requests.length)).join("")}
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
        ${createActionButton("Надіслати запит на деталі", "handleSendDetailRequest", orderId)}
      </div>
    </div>
  `;
}

function hasActiveDetailRequests(order) {
  return getDetailRequests(order).some(request => {
    const status = normalizeDetailRequestStatus(request.status);
    return status === "CREATED" || status === "WAITING";
  });
}

function hasApprovedDetailRequests(order) {
  return getDetailRequests(order).some(request => {
    const status = normalizeStatus(request.status);
    return status === "APPROVED";
  });
}

/* ===================== ORDER DETAILS ===================== */

function renderOrderDetails(order, container) {
  const orderId = getOrderId(order);
  const previousReportsHistory = document.getElementById(`reports-history-${orderId}`)?.innerHTML;
  const reportsHistoryHtml = previousReportsHistory || renderReportsHistory([]);

  container.innerHTML = `
    <div class="details-card" onclick="event.stopPropagation()">
      <div class="details-grid">
        ${createDetailsField("Статус", escapeHtml(formatStatus(order.status)))}
        ${createDetailsField("Тип послуги", escapeHtml(formatServiceType(getOrderServiceType(order))))}
        ${createDetailsField("Працівник", escapeHtml(getWorkerDisplayName(order)))}
        ${createDetailsField("Дата створення", formatDate(getOrderCreatedAt(order)))}

        ${createDetailsField("Локація", formatLocation(order), { full: true })}
        ${createDetailsField("Опис проблеми", escapeHtml(getOrderDescription(order)), { full: true, valueClass: "long-text" })}

        ${renderComplaintBlock(order)}

        ${createDetailsField("Результат огляду", escapeHtml(order.inspectionResult ?? "—"), { full: true, valueClass: "long-text" })}
        ${createDetailsField("Історія запитів деталей", renderDetailRequestsHistory(order), { full: true })}
        ${createDetailsField("Останній звіт", escapeHtml(order.workReport ?? order.workReportText ?? "—"), { full: true, valueClass: "long-text" })}

        ${createDetailsField(
          "Історія звітів",
          `<div id="reports-history-${escapeAttr(orderId)}">${reportsHistoryHtml}</div>`,
          { full: true }
        )}

        ${createDetailsField("Дії", renderActionBlock(order, orderId), { full: true })}
      </div>
    </div>
  `;

  loadReportsHistory(orderId);
}

/* ===================== ACTION BLOCKS ===================== */

function getInactiveActionText(status) {
  const messages = {
    IN_PROGRESS: "Щоб написати результат огляду, відкрий заявку в режимі обробки.",
    INSPECTION: "Щоб надіслати запит на деталі або перейти до виконання, відкрий заявку в режимі обробки.",
    WAITING_DETAILS: "Заявка очікує деталей. Якщо потрібно додати ще один запит, відкрий заявку в режимі обробки.",
    DETAILS_RECEIVED: "Щоб створити додатковий запит деталей або перейти до виконання, відкрий заявку в режимі обробки.",
    EXECUTION: "Щоб написати фінальний звіт, відкрий заявку в режимі обробки.",
    REWORK: "Щоб виконати переробку, відкрий заявку в режимі обробки."
  };

  return messages[status] || "Щоб виконувати дії із заявкою, відкрий її в окремому режимі обробки.";
}

function renderInactiveActionBlock(orderId, status) {
  return `
    <div class="action-block inactive-action-block">
      <div class="inactive-title">Дії недоступні у списку</div>
      <div class="inactive-text">${escapeHtml(getInactiveActionText(status))}</div>

      <div class="action-row">
        ${createActionButton("Відкрити обробку заявки", "openOrderWorkspace", orderId, "btn-action secondary")}
      </div>
    </div>
  `;
}

function renderInspectionAction(order, orderId) {
  return `
    <div class="action-block">
      <textarea
        id="inspection-${escapeAttr(orderId)}"
        class="action-textarea"
        placeholder="Введіть результат огляду..."
      >${escapeHtml(order.inspectionResult ?? "")}</textarea>

      <div class="action-row">
        ${createActionButton("Зберегти огляд", "handleSaveInspection", orderId)}
      </div>
    </div>
  `;
}

function renderExecutionAction(orderId) {
  return `
    <div class="action-block">
      <textarea
        id="work-report-${escapeAttr(orderId)}"
        class="action-textarea"
        placeholder="Введіть звіт по виконаній роботі..."></textarea>

      <div class="action-row">
        ${createActionButton("Завершити заявку", "handleFinishOrder", orderId)}
      </div>
    </div>
  `;
}

function renderReworkAction(orderId) {
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
        ${createActionButton("Завершити переробку", "handleRework", orderId)}
      </div>
    </div>
  `;
}

function renderLockedAction(title, text) {
  return `
    <div class="action-block locked-action-block">
      <div class="locked-title">${escapeHtml(title)}</div>
      <div class="locked-text">${escapeHtml(text)}</div>
    </div>
  `;
}

function renderActionBlock(order, orderId) {
  const status = normalizeStatus(order.status);
  const focused = isFocusedOrder(orderId);

  const needsFocusedWorkspace = [
    "IN_PROGRESS",
    "INSPECTION",
    "WAITING_DETAILS",
    "DETAILS_RECEIVED",
    "EXECUTION",
    "REWORK"
  ].includes(status);

  if (!focused && needsFocusedWorkspace) {
    return renderInactiveActionBlock(orderId, status);
  }

  if (status === "ASSIGNED") {
    return `
      <div class="action-block">
        <div class="action-row">
          ${createActionButton("Приступити до роботи", "handleStart", orderId)}
        </div>
      </div>
    `;
  }

  if (status === "IN_PROGRESS") {
    return renderInspectionAction(order, orderId);
  }

  if (status === "INSPECTION") {
    return `
      <div class="action-block">
        ${renderDetailRequestForm(orderId, "Створити запит на деталі")}

        <div class="action-row">
          ${createActionButton("Перевести до виконання без деталей", "handleMoveToExecution", orderId, "btn-action secondary")}
        </div>
      </div>
    `;
  }

  if (status === "WAITING_DETAILS") {
    if (!hasActiveDetailRequests(order)) {
      return `
        <div class="action-block">
          <div class="action-row">
            <span class="state-badge">${hasApprovedDetailRequests(order) ? "Видано" : "Запити закрито"}</span>
          </div>

          <div class="inactive-text">
            Активних запитів деталей немає. Можна перейти до виконання заявки.
          </div>

          ${renderDetailRequestForm(orderId, "Створити ще один запит деталей")}

          <div class="action-row execution-action-row">
            ${createActionButton("Перевести до виконання", "handleMoveToExecution", orderId)}
          </div>
        </div>
      `;
    }

    return `
      <div class="action-block">
        <div class="locked-action-block">
          <div class="locked-title">Очікування деталей</div>
          <div class="locked-text">
            У заявки є активний запит деталей. Перейти до виконання можна після статусу "Видано" або "Скасовано".
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
          <span class="state-badge">Видано</span>
        </div>

        <div class="inactive-text">
          Усі активні запити деталей закриті. Якщо матеріал видано, можна створити ще один запит деталей,
          якщо під час перевірки виявилась додаткова потреба, або перейти до виконання.
        </div>

        ${renderDetailRequestForm(orderId, "Створити додатковий запит деталей")}

        <div class="action-row execution-action-row">
          ${createActionButton("Перевести до виконання", "handleMoveToExecution", orderId)}
        </div>
      </div>
    `;
  }

  if (status === "EXECUTION") {
    return renderExecutionAction(orderId);
  }

  if (status === "REWORK") {
    return renderReworkAction(orderId);
  }

  if (status === "REWORK_REVIEW") {
    return renderLockedAction(
      "Перероблено",
      "Повторний звіт надіслано начальнику. Заявка очікує остаточного закриття начальником."
    );
  }

  if (status === "UNDER_COMPLAINT") {
    return renderLockedAction(
      "Заявка на оскарженні",
      "Працівник подав скаргу. Очікується рішення начальника."
    );
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

function renderReportHistoryItem(report, index) {
  return `
    <div class="report-history-item">
      <div class="report-history-head">
        <strong>Звіт ${index + 1}</strong>
        <span>${escapeHtml(formatDate(report.createdAt))}</span>
      </div>

      <div class="report-history-body">
        ${escapeHtml(report.reportText ?? report.text ?? "—")}
      </div>
    </div>
  `;
}

function renderReportsHistory(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return `<div class="details-value long-text">—</div>`;
  }

  return `
    <div class="reports-history">
      ${reports.map(renderReportHistoryItem).join("")}
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

function setSpecialistDetailRequestFilter(status) {
  specialistDetailRequestFilter = normalizeStatus(status);

  document.querySelectorAll("[data-detail-request-filter]").forEach(button => {
    const value = normalizeStatus(button.dataset.detailRequestFilter || "");
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
    workerName: getWorkerDisplayName(order),
    serviceType: getOrderServiceType(order),
    descriptionProblem: getOrderDescription(order),
    location: formatLocation(order),
    createdAt: getOrderCreatedAt(order)
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

  return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function isActiveSpecialistDetailRequest(request) {
  const status = normalizeDetailRequestStatus(request?.status);
  return status === "CREATED" || status === "WAITING";
}

function shouldIndicateSpecialistDetailRequest(request) {
  return normalizeDetailRequestStatus(request?.status) === "WAITING";
}

function setSpecialistTabBadge(tabName, badgeId, count, title) {
  const badge = document.getElementById(badgeId);
  const tab = document.querySelector(`[data-specialist-tab="${tabName}"]`);

  if (!badge) {
    return;
  }

  badge.textContent = String(count);

  if (count > 0) {
    badge.classList.remove("hidden");
    badge.title = title ? `${title}: ${count}` : "";
    tab?.classList.add("has-alerts");
  } else {
    badge.classList.add("hidden");
    badge.title = "";
    tab?.classList.remove("has-alerts");
  }
}

function updateSpecialistTabBadges() {
  const detailRequestsCount = collectSpecialistDetailRequests()
    .filter(shouldIndicateSpecialistDetailRequest)
    .length;

  const reworksCount = collectSpecialistReworkOrders().length;

  setSpecialistTabBadge(
    "details",
    "specialistDetailsBadge",
    detailRequestsCount,
    "Оновлених запитів деталей"
  );

  setSpecialistTabBadge(
    "reworks",
    "specialistReworksBadge",
    reworksCount,
    "Активних переробок"
  );
}

function isDetailRequestVisibleByFilter(request) {
  if (!specialistDetailRequestFilter) {
    return true;
  }

  const status = normalizeDetailRequestStatus(request.status);

  if (specialistDetailRequestFilter === "CREATED") {
    return status === "CREATED";
  }

  if (specialistDetailRequestFilter === "APPROVED") {
    return status === "APPROVED";
  }

  return status === specialistDetailRequestFilter;
}

function renderSpecialistDetailRequestCard(request) {
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

        <span class="detail-request-status ${escapeAttr(statusClass)}">
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
        ${createActionButton("Відкрити заявку", "openOrderWorkspace", orderId, "btn-action secondary")}
      </div>
    </div>
  `;
}

function renderSpecialistDetailRequestsTab() {
  const container = document.getElementById("specialistDetailRequestsList");
  if (!container) return;

  const allRequests = collectSpecialistDetailRequests();
  updateSpecialistTabBadges();

  const requests = allRequests.filter(isDetailRequestVisibleByFilter);

  if (requests.length === 0) {
    container.innerHTML = `<div class="specialist-subempty">Запитів деталей за вибраним фільтром немає.</div>`;
    return;
  }

  container.innerHTML = requests.map(renderSpecialistDetailRequestCard).join("");
}

/* ===================== SUB TABS: REWORKS ===================== */

function collectSpecialistReworkOrders() {
  return getSpecialistCachedOrders()
    .filter(order => {
      const status = normalizeStatus(order.status);
      return status === "REWORK" || status === "REWORK_REVIEW";
    })
    .sort((a, b) => new Date(getOrderCreatedAt(b) || 0).getTime() - new Date(getOrderCreatedAt(a) || 0).getTime());
}

function renderSpecialistReworkCard(order) {
  const orderId = getOrderId(order);
  const status = normalizeStatus(order.status);

  return `
    <div class="specialist-subitem">
      <div class="specialist-subitem-main">
        <div>
          <div class="specialist-subitem-title">
            ${escapeHtml(formatServiceType(getOrderServiceType(order)))}
          </div>

          <div class="specialist-subitem-meta">
            ${escapeHtml(formatDate(getOrderCreatedAt(order)))}
            · ${escapeHtml(getWorkerDisplayName(order))}
            · ${formatLocation(order)}
          </div>
        </div>

        <span class="status ${escapeAttr(normalizeStatusClass(status))}">
          ${escapeHtml(formatStatus(status))}
        </span>
      </div>

      <div class="specialist-subitem-body">
        <div class="specialist-subfield">
          <span>Опис проблеми</span>
          <p>${escapeHtml(getOrderDescription(order))}</p>
        </div>

        <div class="specialist-subfield specialist-subfield-warning">
          <span>Текст скарги</span>
          <p>${escapeHtml(getComplaintText(order))}</p>
        </div>
      </div>

      <div class="specialist-subitem-actions">
        ${createActionButton("Відкрити обробку заявки", "openOrderWorkspace", orderId, "btn-action secondary")}
      </div>
    </div>
  `;
}

function renderSpecialistReworksTab() {
  const container = document.getElementById("specialistReworksList");
  if (!container) return;

  updateSpecialistTabBadges();

  const orders = collectSpecialistReworkOrders();

  if (orders.length === 0) {
    container.innerHTML = `<div class="specialist-subempty">Заявок на переробці немає.</div>`;
    return;
  }

  container.innerHTML = orders.map(renderSpecialistReworkCard).join("");
}

/* ===================== GLOBAL EXPORTS ===================== */

window.renderOrders = renderOrders;
window.renderOrderDetails = renderOrderDetails;
window.renderActionBlock = renderActionBlock;
window.loadReportsHistory = loadReportsHistory;

window.findSpecialistOrderById = findSpecialistOrderById;
window.setSpecialistOrderDetailsOpen = setSpecialistOrderDetailsOpen;
window.toggleSpecialistOrderDetailsOnly = toggleSpecialistOrderDetailsOnly;
window.replaceSpecialistRenderedOrder = replaceSpecialistRenderedOrder;
window.removeSpecialistRenderedOrder = removeSpecialistRenderedOrder;

window.setSpecialistDetailRequestFilter = setSpecialistDetailRequestFilter;
window.renderSpecialistDetailRequestsTab = renderSpecialistDetailRequestsTab;
window.renderSpecialistReworksTab = renderSpecialistReworksTab;
window.updateSpecialistTabBadges = updateSpecialistTabBadges;
