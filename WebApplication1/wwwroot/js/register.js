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

const inputs = [
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
];

form?.addEventListener("submit", doRegister);

inputs.forEach(input => {
  input?.addEventListener("input", checkFields);
});

modalOkBtn?.addEventListener("click", () => {
  window.location.href = "/index.html";
});

checkFields();

function getFormData() {
  return {
    fullName: fullNameInput.value.trim(),
    login: loginInput.value.trim(),
    password: passwordInput.value,
    confirmPassword: confirmPasswordInput.value,
    position: positionInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),

    passNumberRaw: passNumberInput.value.trim(),
    workshopNumberRaw: workshopInput.value.trim(),
    floorNumberRaw: floorInput.value.trim(),
    officeNumberRaw: officeInput.value.trim()
  };
}

function checkFields() {
  const data = getFormData();

  const allFilled =
    data.fullName &&
    data.login &&
    data.password &&
    data.confirmPassword &&
    data.position &&
    data.phone &&
    data.email &&
    data.passNumberRaw &&
    data.workshopNumberRaw &&
    data.floorNumberRaw &&
    data.officeNumberRaw;

  btn.disabled = !allFilled;
}

function showMessage(message) {
  out.textContent = message || "";
}

function showSuccessModal() {
  successModal?.classList.remove("hidden");

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 1500);
}

function isValidNumber(value) {
  if (!value) return false;

  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

function buildErrorMessage(status, data) {
  if (typeof data === "string" && data.trim()) {
    return `Помилка ${status}: ${data}`;
  }

  if (data?.message) {
    return `Помилка ${status}: ${data.message}`;
  }

  if (data?.title && data?.errors) {
    const errors = Object.values(data.errors)
      .flat()
      .join("\n");

    return `Помилка ${status}: ${data.title}\n${errors}`;
  }

  if (data?.title) {
    return `Помилка ${status}: ${data.title}`;
  }

  return `Помилка ${status}: не вдалося виконати реєстрацію`;
}

async function parseResponse(res) {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function doRegister(e) {
  e.preventDefault();

  const data = getFormData();

  if (
    !data.fullName ||
    !data.login ||
    !data.password ||
    !data.confirmPassword ||
    !data.position ||
    !data.phone ||
    !data.email ||
    !data.passNumberRaw ||
    !data.workshopNumberRaw ||
    !data.floorNumberRaw ||
    !data.officeNumberRaw
  ) {
    showMessage("Заповніть усі поля");
    checkFields();
    return;
  }

  if (data.password.length < 4) {
    showMessage("Пароль занадто короткий");
    return;
  }

  if (data.password !== data.confirmPassword) {
    showMessage("Паролі не співпадають");
    return;
  }

  if (
    !isValidNumber(data.passNumberRaw) ||
    !isValidNumber(data.workshopNumberRaw) ||
    !isValidNumber(data.floorNumberRaw) ||
    !isValidNumber(data.officeNumberRaw)
  ) {
    showMessage("Числові поля повинні бути додатними цілими числами");
    return;
  }

  const passNumber = Number(data.passNumberRaw);
  const workshopNumber = Number(data.workshopNumberRaw);
  const floorNumber = Number(data.floorNumberRaw);
  const officeNumber = Number(data.officeNumberRaw);

  const requestBody = {
    FullName: data.fullName,
    PassNumber: passNumber,
    RoleInSystem: "WORKER",
    Login: data.login,
    Password: data.password,
    Position: data.position,
    Phone: data.phone,
    Email: data.email,
    FloorNumber: floorNumber,
    OfficeNumber: officeNumber,
    WorkshopNumber: workshopNumber
  };

  showMessage("Реєстрація...");
  btn.disabled = true;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await parseResponse(res);

    console.log("REGISTER STATUS:", res.status);
    console.log("REGISTER RESPONSE:", responseData);

    if (res.status === 409) {
      showMessage("Користувач з таким логіном вже існує");
      btn.disabled = false;
      return;
    }

    if (!res.ok) {
      showMessage(buildErrorMessage(res.status, responseData));
      btn.disabled = false;
      return;
    }

    showMessage("");
    showSuccessModal();

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    showMessage("Сервер недоступний");
    btn.disabled = false;
  }
}