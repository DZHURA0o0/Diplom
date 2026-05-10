let openedOrderId = null;

function getWorkerOrderId(order) {
  return getOrderId(order);
}

function isDoneStatus(status) {
  return String(status ?? "").trim().toUpperCase() === "DONE";
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
  } else {
    complaintActionHtml = `
      <button
        type="button"
        class="btn-complaint btn-complaint-disabled"
        disabled
        title="Доступно тільки після виконання заявки">
        Створити
      </button>
    `;
  }

  container.innerHTML = `
    <div class="details-card" onclick="event.stopPropagation()">
      <div class="details-grid">

        <div class="details-field">
          <div class="details-label">Статус</div>
          <div class="details-value">${escapeHtml(formatStatus(order.status))}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Тип послуги</div>
          <div class="details-value">${escapeHtml(formatServiceType(order.serviceType))}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Спеціаліст</div>
          <div class="details-value">${escapeHtml(order.specialistName ?? "—")}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Дата створення</div>
          <div class="details-value">${formatDate(order.createdAt)}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Дата огляду</div>
          <div class="details-value">${formatDate(order.inspectionAt)}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Локація</div>
          <div class="details-value">
            Цех ${escapeHtml(order.productionWorkshopNumber ?? "—")},
            пов. ${escapeHtml(order.floorNumber ?? "—")},
            кімн. ${escapeHtml(order.roomNumber ?? "—")}
          </div>
        </div>

        <div class="details-field full">
          <div class="details-label">Опис проблеми</div>
          <div class="details-value long-text">${escapeHtml(order.descriptionProblem ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Результат огляду</div>
          <div class="details-value long-text">${escapeHtml(order.inspectionResult ?? "—")}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Звіт по роботі</div>
          <div class="details-value long-text">${escapeHtml(order.workReportText ?? "Відсутній")}</div>
        </div>

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
              <div class="details-field full complaint-text">
                <div class="details-label">Текст скарги</div>
                <div class="details-value long-text">${escapeHtml(complaintBody || "—")}</div>
              </div>

              <div class="details-field">
                <div class="details-label">Дата подання</div>
                <div class="details-value">${escapeHtml(complaintCreatedAt)}</div>
              </div>
            `
            : ""
        }

      </div>
    </div>
  `;
}

window.renderOrders = renderOrders;
window.renderOrderDetails = renderOrderDetails;
window.toggleDetails = toggleDetails;
window.replaceWorkerRenderedOrder = replaceWorkerRenderedOrder;
window.setWorkerOrderDetailsOpen = setWorkerOrderDetailsOpen;