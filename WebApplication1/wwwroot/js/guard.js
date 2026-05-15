async function requireRole(roles) {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  const res = await fetch("/api/auth/me", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!res.ok) {
    window.location.href = "/";
    return;
  }

  const data = await res.json();
  const userRole = String(data.role || "").toUpperCase();
  const allowedRoles = roles.map(role => String(role).toUpperCase());
  const effectiveUserRoles = getEffectiveRoles(userRole);

  if (!allowedRoles.some(role => effectiveUserRoles.includes(role))) {
    window.location.href = "/";
  }
}

function getEffectiveRoles(role) {
  const normalizedRole = String(role || "").toUpperCase();
  const roles = [normalizedRole];

  if (["WAREHOUSE_MANAGER", "WAREHOUSE_WORKER"].includes(normalizedRole)) {
    roles.push("WORKER");
  }

  return roles;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  window.location.href = "/";
}
