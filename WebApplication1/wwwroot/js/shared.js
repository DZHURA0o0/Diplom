/*
  Shared frontend helpers.
  Common functions for worker, specialist, boss, create-order, create-complaint pages.
*/

const API_BASE = "";

const COMMON_STATUS_LABELS = {
  NEW: "Нова",
  ASSIGNED: "Призначена",
  IN_PROGRESS: "У роботі",
  INSPECTION: "На перевірці",
  WAITING_DETAILS: "Очікує",
  DETAILS_RECEIVED: "Деталі",
  EXECUTION: "На виконанні",
  UNDER_COMPLAINT: "На оскарженні",
  REWORK: "На переробці",
  REWORK_REVIEW: "Перероблено",
  DONE: "Виконана",
  CANCELED: "Скасована"
};

const COMMON_STATUS_BADGE_LABELS = {
  NEW: "НОВА",
  ASSIGNED: "ПРИЗНАЧЕНА",
  IN_PROGRESS: "У РОБОТІ",
  INSPECTION: "ОГЛЯД",
  WAITING_DETAILS: "ОЧІКУЄ",
  DETAILS_RECEIVED: "ОТРИМАНО",
  EXECUTION: "ВИКОНАННЯ",
  UNDER_COMPLAINT: "СКАРГА",
  REWORK: "НА ПЕРЕРОБЦІ",
  REWORK_REVIEW: "НА ПЕРЕВІРЦІ",
  DONE: "ВИКОНАНА",
  CANCELED: "СКАСОВАНА"
};

const COMMON_SERVICE_TYPE_LABELS = {
  ELECTRICAL: "Електроживлення / електрика",
  PC_PROBLEM: "Проблема з комп’ютером",
  PRINTER_PROBLEM: "Проблема з принтером",
  CARTRIDGE_REFILL: "Заправка картриджа",
  SOFTWARE_BUG: "Баг програмного забезпечення",
  INTERNET: "Інтернет / мережа",
  SEAL_DAMAGE: "Відсутня пломба / пошкоджена",
  AUDIO_VIDEO: "Проблема з відео/аудіо обладнанням",
  OTHER: "Інше",
  HEATING: "Опалення",
  PLUMBING: "Сантехніка"
};

const COMMON_ROLE_LABELS = {
  WORKER: "Працівник",
  SPECIALIST: "Спеціаліст",
  BOSS: "Начальник"
};

const COMMON_ACCOUNT_STATUS_LABELS = {
  ACTIVE: "Активний",
  INACTIVE: "Неактивний",
  REGISTRATION: "На реєстрації"
};

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: "Bearer " + getToken()
  };
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getApiErrorMessage(data, fallback = "Помилка запиту") {
  if (typeof data === "string") {
    return data || fallback;
  }

  return data?.message ?? data?.error ?? fallback;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {})
  });

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, `Помилка запиту: ${response.status}`));
  }

  return data;
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleString();
}

function formatStatus(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return COMMON_STATUS_LABELS[key] ?? (value ?? "—");
}

function formatStatusBadge(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return COMMON_STATUS_BADGE_LABELS[key] ?? (value ?? "—");
}

function formatServiceType(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return COMMON_SERVICE_TYPE_LABELS[key] ?? (value ?? "—");
}

function formatRole(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return COMMON_ROLE_LABELS[key] ?? (value ?? "—");
}

function formatAccountStatus(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return COMMON_ACCOUNT_STATUS_LABELS[key] ?? (value ?? "—");
}

function normalizeStatusClass(status) {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function formatLocation(order) {
  return `Цех ${escapeHtml(order?.productionWorkshopNumber ?? "—")}, пов. ${escapeHtml(order?.floorNumber ?? "—")}, кімн. ${escapeHtml(order?.roomNumber ?? "—")}`;
}

function getOrderId(order) {
  return String(order?.id ?? order?._id ?? "");
}

function sortOrdersNewFirst(data) {
  return [...(Array.isArray(data) ? data : [])].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

function setPendingButton(button, pendingText) {
  if (!button) {
    return null;
  }

  const originalText = button.textContent;

  button.disabled = true;
  button.dataset.originalText = originalText;
  button.textContent = pendingText;

  return () => {
    button.disabled = false;
    button.textContent = button.dataset.originalText || originalText;
  };
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  window.location.href = "/";
}

/*
  Explicit global export.
  This prevents "apiRequest is not defined" and similar errors.
*/

window.API_BASE = API_BASE;

window.COMMON_STATUS_LABELS = COMMON_STATUS_LABELS;
window.COMMON_STATUS_BADGE_LABELS = COMMON_STATUS_BADGE_LABELS;
window.COMMON_SERVICE_TYPE_LABELS = COMMON_SERVICE_TYPE_LABELS;
window.COMMON_ROLE_LABELS = COMMON_ROLE_LABELS;
window.COMMON_ACCOUNT_STATUS_LABELS = COMMON_ACCOUNT_STATUS_LABELS;

window.getToken = getToken;
window.authHeaders = authHeaders;
window.readResponse = readResponse;
window.getApiErrorMessage = getApiErrorMessage;
window.apiRequest = apiRequest;

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.escapeJs = escapeJs;

window.formatDate = formatDate;
window.formatStatus = formatStatus;
window.formatStatusBadge = formatStatusBadge;
window.formatServiceType = formatServiceType;
window.formatRole = formatRole;
window.formatAccountStatus = formatAccountStatus;

window.normalizeStatusClass = normalizeStatusClass;
window.formatLocation = formatLocation;
window.getOrderId = getOrderId;
window.sortOrdersNewFirst = sortOrdersNewFirst;
window.setPendingButton = setPendingButton;
window.logout = logout;
