document.getElementById("btnLogin").addEventListener("click", doLogin);

async function doLogin() {
  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value;

  const out = document.getElementById("result");
  out.textContent = "Logging in...";

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password })
  });

  if (!res.ok) {
    out.textContent = "Ошибка: неверный логин/пароль или аккаунт не ACTIVE";
    return;
  }

  const data = await res.json();

  localStorage.setItem("token", data.token);
localStorage.setItem("role", data.role);

const role = (data.role || "").toUpperCase();

if (role === "WORKER") window.location.href = "/workerPage.html";
else if (role === "SPECIALIST") window.location.href = "/specialistPage.html";
else if (role === "BOSS") window.location.href = "/bossPage.html";
else window.location.href = "/";
}