const STATUS_LABELS = {
  ASSIGNED: "Призначена",
  IN_PROGRESS: "У роботі",
  INSPECTION: "На перевірці",
  WAITING_DETAILS: "Очікує деталей",
  EXECUTION: "На виконанні",
  REWORK: "На переробці",
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
  OTHER: "Інше",
  PLUMBING: "Сантехніка"
};

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
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
  if (!value) return "—";

  const date = new Date(value);
  if (isNaN(date.getTime())) return escapeHtml(value);

  return date.toLocaleString();
}

function formatStatus(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return STATUS_LABELS[key] ?? (value ?? "—");
}

function formatServiceType(value) {
  const key = String(value ?? "").trim().toUpperCase();
  return SERVICE_TYPE_LABELS[key] ?? (value ?? "—");
}

function normalizeStatusClass(status) {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function formatLocation(order) {
  return `Цех ${escapeHtml(order.productionWorkshopNumber ?? "—")}, пов. ${escapeHtml(order.floorNumber ?? "—")}, кімн. ${escapeHtml(order.roomNumber ?? "—")}`;
}

function sortOrdersNewFirst(data) {
  return [...data].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

function getOrderId(order) {
  return String(order?.id ?? order?._id ?? "");
}