let openedOrderId = null;

const STATUS_LABELS = {
  NEW: "Нова",
  ASSIGNED: "Призначена",
  IN_PROGRESS: "У роботі",
  INSPECTION: "На перевірці",
  WAITING_DETAILS: "Очікує деталей",
  EXECUTION: "Виконується",
  DONE: "Виконана",
  CANCELED: "Скасована"
};

const SERVICE_TYPE_LABELS = {
  ELECTRICAL: "Електроживлення / електрика",
  PC_PROBLEM: "Проблема з комп’ютером",
  PRINTER_PROBLEM: "Проблема з принтером",
  SOFTWARE_BUG: "Баг програмного забезпечення",
  INTERNET: "Інтернет / мережа",
  SEAL_DAMAGE: "Відсутня пломба / пошкоджена",
  AUDIO_VIDEO: "Проблема з відео/аудіо обладнанням",
  OTHER: "Інше"
};

function formatStatus(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return STATUS_LABELS[key] ?? (value ?? "—");
}

function formatServiceType(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return SERVICE_TYPE_LABELS[key] ?? (value ?? "—");
}

function renderOrders(data) {
  const container = document.getElementById("orders");

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `<div class="empty">Заявок не знайдено.</div>`;
    openedOrderId = null;
    return;
  }

  let html = "";

  for (const o of data) {
    const rawId = String(o.id ?? o._id ?? "");
    const safeId = escapeAttr(rawId);
    const isOpen = openedOrderId === rawId;

    const statusRaw = String(o.status ?? "—");
    const statusText = escapeHtml(formatStatus(statusRaw));
    const statusClass = normalizeStatusClass(statusRaw);

    const serviceType = escapeHtml(formatServiceType(o.serviceType));
    const descriptionProblem = escapeHtml(o.descriptionProblem ?? "—");
    const specialistName = escapeHtml(o.specialistName ?? "—");
    const createdAt = formatDate(o.createdAt);

    const locationText = `Цех ${escapeHtml(o.productionWorkshopNumber ?? "—")}, пов. ${escapeHtml(o.floorNumber ?? "—")}, кімн. ${escapeHtml(o.roomNumber ?? "—")}`;

    html += `
      <div class="order-item">
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

  container.innerHTML = html;

  for (const o of data) {
    const rawId = String(o.id ?? o._id ?? "");
    const el = document.getElementById(`details-${rawId}`);
    if (el) {
      renderOrderDetails(o, el);
    }
  }
}

function toggleDetails(id) {
  openedOrderId = openedOrderId === id ? null : id;
  loadOrders();
}
function isDoneStatus(status) {
  return String(status ?? "").trim().toUpperCase() === "DONE";
}

function renderOrderDetails(o, container) {
  const hasComplaint = !!o.complaint?.isSubmitted;
  const isDone = isDoneStatus(o.status);

  const complaintStatusText = hasComplaint ? "Подана" : "Відсутня";
  const complaintBody = o.complaint?.text ?? "";
  const complaintCreatedAt = o.complaint?.createdAt
    ? formatDate(o.complaint.createdAt)
    : "—";

  let complaintActionHtml = "";

  if (hasComplaint) {
    complaintActionHtml = `<div class="complaint-exists">Подана</div>`;
  } else if (isDone) {
    complaintActionHtml = `
      <button
        type="button"
        class="btn-complaint"
        onclick="goToComplaintPage('${escapeJs(o.id ?? "")}', '${escapeJs(o.status ?? "")}')">
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
    <div class="details-card">
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
          <div class="details-label">Спеціаліст</div>
          <div class="details-value">${escapeHtml(o.specialistName ?? "—")}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Дата створення</div>
          <div class="details-value">${formatDate(o.createdAt)}</div>
        </div>

        <div class="details-field">
          <div class="details-label">Дата огляду</div>
          <div class="details-value">${formatDate(o.inspectionAt)}</div>
        </div>

        <div class="details-field full">
          <div class="details-label">Локація</div>
          <div class="details-value">
            Цех ${escapeHtml(o.productionWorkshopNumber ?? "—")},
            пов. ${escapeHtml(o.floorNumber ?? "—")},
            кімн. ${escapeHtml(o.roomNumber ?? "—")}
          </div>
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
          <div class="details-label">Звіт по роботі</div>
          <div class="details-value long-text">${escapeHtml(o.workReportText ?? "Відсутній")}</div>
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
function goToComplaintPage(orderId, status) {
  if (!orderId) return;
  if (!isDoneStatus(status)) return;

  window.location.href = `/create-complaint.html?orderId=${encodeURIComponent(orderId)}`;
}

function normalizeStatusClass(status) {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function escapeJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}