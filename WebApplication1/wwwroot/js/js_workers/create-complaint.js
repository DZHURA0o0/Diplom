const complaintPageState = {
  orderId: new URLSearchParams(window.location.search).get("orderId") || "",
  toastTimer: null,
  isSubmitting: false
};

/* ===================== DOM HELPERS ===================== */

function getComplaintElements() {
  return {
    orderIdInput: document.getElementById("orderId"),
    textArea: document.getElementById("complaintText"),
    button: document.querySelector(".btn-submit"),
    msg: document.getElementById("msg"),
    toast: document.getElementById("toast")
  };
}

function setComplaintMessage(text, isSuccess = false) {
  const { msg } = getComplaintElements();

  if (!msg) {
    return;
  }

  msg.textContent = text || "";
  msg.className = isSuccess ? "form-msg success" : "form-msg";
}

function showComplaintToast(message, type = "success") {
  const { toast } = getComplaintElements();

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  clearTimeout(complaintPageState.toastTimer);

  complaintPageState.toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function setComplaintFormEnabled(enabled) {
  const { textArea, button } = getComplaintElements();

  if (textArea) {
    textArea.disabled = !enabled;
  }

  if (button) {
    button.disabled = !enabled;
  }
}

function setComplaintButtonText(text) {
  const { button } = getComplaintElements();

  if (button) {
    button.textContent = text;
  }
}

function getComplaintText() {
  const { textArea } = getComplaintElements();
  return textArea?.value?.trim() || "";
}

/* ===================== VALIDATION ===================== */

const COMPLAINT_VALIDATION_RULES = [
  {
    isInvalid: () => !complaintPageState.orderId,
    message: "Немає ID заявки."
  },
  {
    isInvalid: text => !text || text.length < 3,
    message: "Введи текст скарги мінімум 3 символи."
  },
  {
    isInvalid: text => text.length > 2000,
    message: "Текст скарги занадто довгий. Максимум 2000 символів."
  }
];

function getComplaintValidationError(text) {
  const failedRule = COMPLAINT_VALIDATION_RULES.find(rule => rule.isInvalid(text));
  return failedRule?.message || "";
}

function validateComplaintForm(showMessage = false) {
  const text = getComplaintText();
  const error = getComplaintValidationError(text);

  if (error) {
    if (showMessage) {
      setComplaintMessage(error);
      showComplaintToast(error, "error");
    }

    return false;
  }

  setComplaintMessage("");
  return true;
}

/* ===================== API ===================== */

async function sendComplaint(orderId, text) {
  return await apiRequest(`/api/worker/orders/${encodeURIComponent(orderId)}/complaint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });
}

/* ===================== ACTION ===================== */

async function submitComplaint() {
  if (complaintPageState.isSubmitting) {
    return;
  }

  if (!validateComplaintForm(true)) {
    return;
  }

  const { button } = getComplaintElements();
  const text = getComplaintText();

  complaintPageState.isSubmitting = true;

  const restoreButton = setPendingButton(button, "Подання...");
  setComplaintFormEnabled(false);
  setComplaintMessage("Подання скарги...");

  try {
    const result = await sendComplaint(complaintPageState.orderId, text);

    setComplaintMessage(result?.message || "Скаргу відправлено.", true);
    showComplaintToast("Скаргу відправлено", "success");

    setTimeout(() => {
      window.location.href = "/workerPage.html";
    }, 1200);
  } catch (e) {
    const message = e.message || "Сервер не відповідає";

    complaintPageState.isSubmitting = false;

    restoreButton?.();
    setComplaintFormEnabled(true);
    setComplaintButtonText("Подати скаргу");

    setComplaintMessage(message);
    showComplaintToast(message, "error");
  }
}

/* ===================== INIT ===================== */

function initComplaintPage() {
  const { orderIdInput, textArea } = getComplaintElements();

  if (orderIdInput) {
    orderIdInput.value = complaintPageState.orderId;
  }

  if (!complaintPageState.orderId) {
    setComplaintFormEnabled(false);
    setComplaintMessage("Немає ID заявки. Повернись до списку заявок і відкрий скаргу звідти.");
    showComplaintToast("Немає ID заявки", "error");
    return;
  }

  setComplaintFormEnabled(true);

  if (textArea) {
    textArea.addEventListener("input", () => {
      if (!complaintPageState.isSubmitting) {
        validateComplaintForm(false);
      }
    });
  }
}

/* ===================== GLOBAL EXPORTS ===================== */

window.submitComplaint = submitComplaint;

window.addEventListener("DOMContentLoaded", initComplaintPage);