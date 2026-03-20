const btn = document.getElementById("btnLogin");
const loginInput = document.getElementById("login");
const passwordInput = document.getElementById("password");
const out = document.getElementById("result");

btn.addEventListener("click", doLogin);
loginInput.addEventListener("input", checkFields);
passwordInput.addEventListener("input", checkFields);

btn.disabled = true;

function checkFields() {
  const login = loginInput.value.trim();
  const password = passwordInput.value;

  btn.disabled = !(login && password);
}

async function doLogin() {

  const login = loginInput.value.trim();
  const password = passwordInput.value;

  if (!login || !password) {
    out.textContent = "Введите логин и пароль";
    return;
  }

  out.textContent = "Logging in...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });

    if (res.status === 503) {
      out.textContent = "Ошибка: база данных недоступна";
      btn.disabled = false;
      return;
    }

    if (res.status === 401) {
      out.textContent = "Ошибка: неверный логин/пароль или аккаунт не ACTIVE";
      btn.disabled = false;
      return;
    }

    if (!res.ok) {
      out.textContent = "Ошибка сервера";
      btn.disabled = false;
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

  } catch (e) {
    out.textContent = "Сервер недоступен";
    btn.disabled = false;
  }
}