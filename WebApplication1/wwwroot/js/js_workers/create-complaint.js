const query = new URLSearchParams(window.location.search);
const orderId = query.get("orderId") || "";

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("orderId").value = orderId;
});

function setMessage(text, isSuccess = false) {
  const msg = document.getElementById("msg");
  msg.textContent = text;
  msg.className = isSuccess ? "form-msg success" : "form-msg";
}

async function submitComplaint() {
  const text = document.getElementById("complaintText").value.trim();
  const btn = document.querySelector(".btn-submit");

  setMessage("");

  if (!orderId) {
    setMessage("Не вдалося визначити ID заявки.");
    return;
  }

  if (text.length < 5) {
    setMessage("Текст скарги занадто короткий.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Подання...";

  try {
    const res = await fetch(`/api/worker/orders/${encodeURIComponent(orderId)}/complaint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ text })
    });

    let data = null;
    let rawText = "";

    try {
      rawText = await res.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      setMessage(data?.message || rawText || "Не вдалося подати скаргу.");
      return;
    }

    setMessage(data?.message || "Скаргу успішно подано.", true);

    setTimeout(() => {
      window.location.href = "/workerPage.html";
    }, 900);
  } catch {
    setMessage("Помилка з'єднання з сервером.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Подати скаргу";
  }
}