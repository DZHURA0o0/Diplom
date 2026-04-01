const query = new URLSearchParams(window.location.search);
const orderId = query.get("orderId") || "";

let toastTimer = null;

window.addEventListener("DOMContentLoaded", () => {
  const orderIdInput = document.getElementById("orderId");
  if (orderIdInput) {
    orderIdInput.value = orderId;
  }

  // 🔥 ВСЕГДА РАЗБЛОКИРОВАНО
  setFormEnabled(true);
});

function setMessage(text, isSuccess = false) {
  const msg = document.getElementById("msg");
  if (!msg) return;

  msg.textContent = text;
  msg.className = isSuccess ? "form-msg success" : "form-msg";
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function setFormEnabled(enabled) {
  const textArea = document.getElementById("complaintText");
  const btn = document.querySelector(".btn-submit");

  if (textArea) textArea.disabled = !enabled;
  if (btn) btn.disabled = !enabled;
}

async function submitComplaint() {
  const textArea = document.getElementById("complaintText");
  const btn = document.querySelector(".btn-submit");

  if (!textArea || !btn) return;

  const text = textArea.value.trim();

  setMessage("");

  if (!orderId) {
    showToast("Немає ID заявки", "error");
    return;
  }

  if (text.length < 3) {
    showToast("Введи текст", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Подання...";

  try {
    const res = await fetch(`/api/worker/orders/${encodeURIComponent(orderId)}/complaint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (localStorage.getItem("token") || "")
      },
      body: JSON.stringify({ text })
    });

    const raw = await res.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!res.ok) {
      showToast(data?.message || raw || "Помилка", "error");
      return;
    }

    showToast("Скаргу відправлено", "success");

    setTimeout(() => {
      window.location.href = "/workerPage.html";
    }, 1200);

  } catch {
    showToast("Сервер не відповідає", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Подати скаргу";
  }
}