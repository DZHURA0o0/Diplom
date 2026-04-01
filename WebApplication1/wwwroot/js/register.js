const form = document.getElementById("registerForm");
const btn = document.getElementById("btnRegister");
const out = document.getElementById("result");

const fullNameInput = document.getElementById("fullName");
const loginInput = document.getElementById("login");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const positionInput = document.getElementById("position");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");

const passNumberInput = document.getElementById("passNumber");
const workshopInput = document.getElementById("workshopNumber");
const floorInput = document.getElementById("floorNumber");
const officeInput = document.getElementById("officeNumber");

const successModal = document.getElementById("successModal");
const modalOkBtn = document.getElementById("modalOkBtn");

form.addEventListener("submit", doRegister);

[
  fullNameInput,
  loginInput,
  passwordInput,
  confirmPasswordInput,
  positionInput,
  phoneInput,
  emailInput,
  passNumberInput,
  workshopInput,
  floorInput,
  officeInput
].forEach(x => x?.addEventListener("input", checkFields));

modalOkBtn?.addEventListener("click", () => {
  window.location.href = "/index.html";
});

btn.disabled = true;

function checkFields() {
  const fullName = fullNameInput.value.trim();
  const login = loginInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const position = positionInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();

  const passNumber = passNumberInput.value.trim();
  const workshopNumber = workshopInput.value.trim();
  const floorNumber = floorInput.value.trim();
  const officeNumber = officeInput.value.trim();

  btn.disabled = !(
    fullName &&
    login &&
    password &&
    confirmPassword &&
    position &&
    phone &&
    email &&
    passNumber &&
    workshopNumber &&
    floorNumber &&
    officeNumber
  );
}

function showSuccessModal() {
  successModal?.classList.remove("hidden");

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 1500);
}

async function doRegister(e) {
  e.preventDefault();

  const fullName = fullNameInput.value.trim();
  const login = loginInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const position = positionInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();

  const passNumber = Number(passNumberInput.value);
  const workshopNumber = Number(workshopInput.value);
  const floorNumber = Number(floorInput.value);
  const officeNumber = Number(officeInput.value);

  if (
    !fullName ||
    !login ||
    !password ||
    !confirmPassword ||
    !position ||
    !phone ||
    !email ||
    !passNumberInput.value.trim() ||
    !workshopInput.value.trim() ||
    !floorInput.value.trim() ||
    !officeInput.value.trim()
  ) {
    out.textContent = "Заповніть усі поля";
    return;
  }

  if (password.length < 4) {
    out.textContent = "Пароль занадто короткий";
    return;
  }

  if (password !== confirmPassword) {
    out.textContent = "Паролі не співпадають";
    return;
  }

  if (
    Number.isNaN(passNumber) ||
    Number.isNaN(workshopNumber) ||
    Number.isNaN(floorNumber) ||
    Number.isNaN(officeNumber)
  ) {
    out.textContent = "Числові поля заповнені некоректно";
    return;
  }

  out.textContent = "Реєстрація...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        FullName: fullName,
        PassNumber: passNumber,
        RoleInSystem: "WORKER",
        Login: login,
        Password: password,
        Position: position,
        Phone: phone,
        Email: email,
        FloorNumber: floorNumber,
        OfficeNumber: officeNumber,
        WorkshopNumber: workshopNumber
      })
    });

    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (res.status === 409) {
      out.textContent = "Користувач з таким логіном вже існує";
      btn.disabled = false;
      return;
    }

    if (!res.ok) {
      out.textContent =
        (typeof data === "string" && data) ||
        data?.message ||
        "Помилка реєстрації";
      btn.disabled = false;
      return;
    }

    out.textContent = "";
    showSuccessModal();
  } catch (e) {
    out.textContent = "Сервер недоступний";
    btn.disabled = false;
  }
}