let openedOrderId = null;

function getWorkerOrderId(order) {
  return getOrderId(order);
}

function isDoneStatus(status) {
  return String(status ?? "").trim().toUpperCase() === "DONE";
}

function hasWorkerDetailsValue(value) {
  const text = String(value ?? "").trim();

  return text !== "" && text !== "—";
}

function renderWorkerDetailsField(label, value, options = {}) {
  if (!hasWorkerDetailsValue(value)) {
    return "";
  }

  const className = options.full ? "details-field full" : "details-field";
  const valueClass = options.long ? "details-value long-text" : "details-value";

  return `
    <div class="${className}">
      <div class="details-label">${escapeHtml(label)}</div>
      <div class="${valueClass}">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderWorkerDetailsLocation(order) {
  const parts = [];

  if (hasWorkerDetailsValue(order.productionWorkshopNumber)) {
    parts.push(`Цех ${order.productionWorkshopNumber}`);
  }

  if (hasWorkerDetailsValue(order.floorNumber)) {
    parts.push(`пов. ${order.floorNumber}`);
  }

  if (hasWorkerDetailsValue(order.roomNumber)) {
    parts.push(`кімн. ${order.roomNumber}`);
  }

  return renderWorkerDetailsField("Локація", parts.join(", "), { full: true });
}

function getWorkerOrderById(orderId) {
  const id = String(orderId);

  return (window.workerOrdersState?.orders || [])
    .find(order => getWorkerOrderId(order) === id) || null;
}

function renderOrders(data) {
  const container = document.getElementById("orders");

  if (!container) {
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
    openedOrderId = null;
    return;
  }

  container.innerHTML = data.map(renderWorkerOrderItem).join("");

  if (openedOrderId) {
    const order = getWorkerOrderById(openedOrderId);
    const details = document.getElementById(`details-${openedOrderId}`);

    if (order && details) {
      renderOrderDetails(order, details);
    }
  }
}

function renderWorkerOrderItem(order) {
  const rawId = getWorkerOrderId(order);
  const safeId = escapeAttr(rawId);
  const isOpen = openedOrderId === rawId;

  const statusRaw = String(order.status ?? "—");
  const statusText = escapeHtml(formatStatusBadge(statusRaw));
  const statusClass = "status-" + normalizeStatusClass(statusRaw);

  const serviceType = escapeHtml(formatServiceType(order.serviceType));
  const descriptionProblem = escapeHtml(order.descriptionProblem ?? "—");
  const specialistName = escapeHtml(order.specialistName ?? "—");
  const createdAt = formatDate(order.createdAt);
  const locationText = formatLocation(order);

  return `
    <div class="order-item" data-order-id="${safeId}">
      <div class="order-row ${isOpen ? "expanded" : ""}" onclick="toggleDetails('${escapeJs(rawId)}')">
        <div class="col">
          <span class="status ${statusClass}">${statusText}</span>
        </div>

        <div class="col">
          <div class="value">${serviceType}</div>
        </div>

        <div class="col wide">
          <div class="truncate" title="${descriptionProblem}">
            ${descriptionProblem}
          </div>
        </div>

        <div class="col">
          <div class="value">${locationText}</div>
        </div>

        <div class="col">
          <div class="value">${specialistName}</div>
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

function getWorkerDetailsElements(orderId) {
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

function setWorkerOrderDetailsOpen(orderId, shouldOpen) {
  const id = String(orderId);
  const order = getWorkerOrderById(id);
  const { row, details, arrow } = getWorkerDetailsElements(id);

  if (!order || !row || !details) {
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

function toggleDetails(id) {
  if (!id) {
    return;
  }

  const targetId = String(id);
  const { details } = getWorkerDetailsElements(targetId);

  if (!details) {
    return;
  }

  const shouldOpen = details.classList.contains("hidden");

  if (openedOrderId && openedOrderId !== targetId) {
    setWorkerOrderDetailsOpen(openedOrderId, false);
  }

  setWorkerOrderDetailsOpen(targetId, shouldOpen);
}

function replaceWorkerRenderedOrder(order) {
  const orderId = getWorkerOrderId(order);

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

  const wasOpen = !oldDetails.classList.contains("hidden");

  if (wasOpen) {
    openedOrderId = orderId;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderWorkerOrderItem(order).trim();

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

function removeWorkerRenderedOrder(orderId) {
  const id = String(orderId);
  const oldDetails = document.getElementById(`details-${id}`);

  if (!oldDetails) {
    return false;
  }

  const oldItem = oldDetails.closest(".order-item");

  if (!oldItem) {
    return false;
  }

  oldItem.remove();

  if (openedOrderId === id) {
    openedOrderId = null;
  }

  const container = document.getElementById("orders");

  if (container && !container.querySelector(".order-item")) {
    container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
  }

  return true;
}

function renderOrderDetails(order, container) {
  const hasComplaint = !!order.complaint?.isSubmitted;
  const isDone = isDoneStatus(order.status);

  const complaintStatusText = hasComplaint ? "Подана" : "Відсутня";
  const complaintBody = order.complaint?.text ?? "";
  const complaintCreatedAt = order.complaint?.createdAt
    ? formatDate(order.complaint.createdAt)
    : "—";

  let complaintActionHtml = "";

  if (hasComplaint) {
    complaintActionHtml = `<div class="complaint-exists">Подана</div>`;
  } else if (isDone) {
    complaintActionHtml = `
      <button
        type="button"
        class="btn-complaint"
        onclick="event.stopPropagation(); goToComplaintPage('${escapeJs(getWorkerOrderId(order))}', '${escapeJs(order.status ?? "")}')">
        Створити
      </button>
    `;
  }

  const complaintHtml = (hasComplaint || isDone)
    ? `
        <div class="details-field complaint-row">
          <div class="complaint-left">
            <div class="details-label">Скарга</div>
            <div class="details-value">${escapeHtml(complaintStatusText)}</div>
          </div>

          <div class="complaint-right">
            ${complaintActionHtml}
          </div>
        </div>

        ${
          hasComplaint
            ? `
              ${renderWorkerDetailsField("Текст скарги", complaintBody, { full: true, long: true })}
              ${renderWorkerDetailsField("Дата подання", complaintCreatedAt)}
            `
            : ""
        }
      `
    : "";

  container.innerHTML = `
    <div class="details-card" onclick="event.stopPropagation()">
      <div class="details-grid">

        ${renderWorkerDetailsField("Статус", formatStatus(order.status))}
        ${renderWorkerDetailsField("Тип послуги", formatServiceType(order.serviceType))}
        ${renderWorkerDetailsField("Спеціаліст", order.specialistName)}
        ${renderWorkerDetailsField("Дата створення", formatDate(order.createdAt))}
        ${renderWorkerDetailsField("Дата огляду", formatDate(order.inspectionAt))}
        ${renderWorkerDetailsLocation(order)}
        ${renderWorkerDetailsField("Опис проблеми", order.descriptionProblem, { full: true, long: true })}
        ${renderWorkerDetailsField("Результат огляду", order.inspectionResult, { full: true, long: true })}
        ${renderWorkerDetailsField("Звіт по роботі", order.workReportText, { full: true, long: true })}
        ${complaintHtml}

      </div>
    </div>
  `;
}

window.renderOrders = renderOrders;
window.renderOrderDetails = renderOrderDetails;
window.toggleDetails = toggleDetails;
window.replaceWorkerRenderedOrder = replaceWorkerRenderedOrder;
window.removeWorkerRenderedOrder = removeWorkerRenderedOrder;
window.setWorkerOrderDetailsOpen = setWorkerOrderDetailsOpen;
