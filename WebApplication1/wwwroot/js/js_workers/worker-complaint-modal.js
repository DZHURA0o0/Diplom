const workerComplaintModalState = {
  orderId: "",
  isSubmitting: false
};

function getWorkerComplaintModalElements() {
  return {
    modal: document.getElementById("workerComplaintModal"),
    text: document.getElementById("workerComplaintText"),
    error: document.getElementById("workerComplaintError"),
    submitBtn: document.getElementById("workerComplaintSubmitBtn"),
    cancelBtn: document.getElementById("workerComplaintCancelBtn")
  };
}

function setWorkerComplaintError(message) {
  const { error } = getWorkerComplaintModalElements();

  if (error) {
    error.textContent = message || "";
  }
}

function openWorkerComplaintModal(orderId) {
  const order = getWorkerOrderById(orderId);
  const { modal, text } = getWorkerComplaintModalElements();

 if (!modal || !text) {
  console.error("Worker complaint modal is not found in workerPage.html.");
  return;
}

  if (!order || !isDoneStatus(order.status)) {
    setWorkerComplaintError("Скаргу можна подати тільки після виконання заявки.");
    return;
  }

  workerComplaintModalState.orderId = String(orderId);
  workerComplaintModalState.isSubmitting = false;

  text.value = "";
  setWorkerComplaintError("");

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  setTimeout(() => text.focus(), 0);
}

function closeWorkerComplaintModal() {
  const { modal, text } = getWorkerComplaintModalElements();

  if (workerComplaintModalState.isSubmitting) {
    return;
  }

  workerComplaintModalState.orderId = "";

  if (text) {
    text.value = "";
  }

  setWorkerComplaintError("");

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.classList.remove("modal-open");
}

function getWorkerComplaintValidationError(text) {
  if (!workerComplaintModalState.orderId) {
    return "ID заявки не знайдено.";
  }

  if (!text || text.length < 3) {
    return "Введи текст скарги мінімум 3 символи.";
  }

  if (text.length > 2000) {
    return "Текст скарги занадто довгий. Максимум 2000 символів.";
  }

  return "";
}

async function submitWorkerComplaintFromModal() {
  const { text, submitBtn } = getWorkerComplaintModalElements();

  if (workerComplaintModalState.isSubmitting) {
    return;
  }

  const complaintText = text?.value?.trim() || "";
  const error = getWorkerComplaintValidationError(complaintText);

  if (error) {
    setWorkerComplaintError(error);
    return;
  }

  workerComplaintModalState.isSubmitting = true;

  const restore = setPendingButton(submitBtn, "Подання...");
  setWorkerComplaintError("");

  try {
    const orderId = workerComplaintModalState.orderId;

    await submitWorkerComplaint(orderId, complaintText);

    const updatedOrder = updateWorkerOrderInCache(orderId, {
      complaint: {
        isSubmitted: true,
        text: complaintText,
        createdAt: new Date().toISOString()
      },
      complaintSubmitted: true
    });

    if (updatedOrder && typeof replaceWorkerRenderedOrder === "function") {
      replaceWorkerRenderedOrder(updatedOrder);
    }

    workerComplaintModalState.isSubmitting = false;
    restore?.();
    closeWorkerComplaintModal();
  } catch (e) {
    workerComplaintModalState.isSubmitting = false;
    restore?.();
    setWorkerComplaintError(e.message || "Не вдалося подати скаргу.");
  }
}

function initWorkerComplaintModal() {
  const { modal, submitBtn, cancelBtn } = getWorkerComplaintModalElements();

  submitBtn?.addEventListener("click", submitWorkerComplaintFromModal);
  cancelBtn?.addEventListener("click", closeWorkerComplaintModal);

  modal?.addEventListener("click", event => {
    if (event.target === modal) {
      closeWorkerComplaintModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeWorkerComplaintModal();
    }
  });
}

window.openWorkerComplaintModal = openWorkerComplaintModal;
window.closeWorkerComplaintModal = closeWorkerComplaintModal;
window.submitWorkerComplaintFromModal = submitWorkerComplaintFromModal;

document.addEventListener("DOMContentLoaded", initWorkerComplaintModal);