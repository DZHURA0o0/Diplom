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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (isNaN(date.getTime())) return escapeHtml(value);

  return date.toLocaleString();
}

function sortOrdersNewFirst(data) {
  return [...data].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}