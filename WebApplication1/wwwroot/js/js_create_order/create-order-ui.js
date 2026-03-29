let selectedServiceType = "";

const createOrderUi = (() => {
  const btn = document.getElementById("btnCreateOrder");
  const msg = document.getElementById("msg");
  const createdBy = document.getElementById("createdBy");

  const elements = {
    descriptionProblem: document.getElementById("descriptionProblem"),
    workshopNumber: document.getElementById("workshopNumber"),
    floorNumber: document.getElementById("floorNumber"),
    roomNumber: document.getElementById("roomNumber"),
    serviceTypeText: document.getElementById("serviceTypeText"),
    serviceTypeSelect: document.getElementById("serviceTypeSelect"),
    successModal: document.getElementById("successModal"),
    successModalOk: document.getElementById("successModalOk")
  };

  function getFields() {
    return {
      serviceType: selectedServiceType,
      descriptionProblem: elements.descriptionProblem.value.trim(),
      workshopNumber: parseInt(elements.workshopNumber.value, 10),
      floorNumber: parseInt(elements.floorNumber.value, 10),
      roomNumber: parseInt(elements.roomNumber.value, 10)
    };
  }

  function setMessage(text, color = "") {
    msg.textContent = text;
    msg.style.color = color;
  }

  function setButtonDisabled(disabled) {
    btn.disabled = disabled;
  }

  function hideCreateButton() {
    btn.style.display = "none";
  }

  function setCreatedBy(text) {
    createdBy.textContent = text;
  }

  function fillUserLocation(data) {
    if (data.workshopNumber !== undefined && data.workshopNumber !== null) {
      elements.workshopNumber.value = data.workshopNumber;
    }

    if (data.floorNumber !== undefined && data.floorNumber !== null) {
      elements.floorNumber.value = data.floorNumber;
    }

    if (data.officeNumber !== undefined && data.officeNumber !== null) {
      elements.roomNumber.value = data.officeNumber;
    }
  }

  function resetForm() {
    selectedServiceType = "";
    elements.serviceTypeText.textContent = "Оберіть тип заявки";

    const options = elements.serviceTypeSelect.querySelectorAll(".custom-option");
    options.forEach(option => option.classList.remove("selected"));

    elements.descriptionProblem.value = "";
  }

  function initCustomSelect(onChange) {
    const select = elements.serviceTypeSelect;
    if (!select) return;

    const trigger = select.querySelector(".custom-select-trigger");
    const options = select.querySelectorAll(".custom-option");

    trigger.addEventListener("click", () => {
      select.classList.toggle("open");
    });

    options.forEach(option => {
      option.addEventListener("click", () => {
        options.forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");

        selectedServiceType = option.dataset.value;
        elements.serviceTypeText.textContent = option.textContent.trim();
        select.classList.remove("open");

        if (typeof onChange === "function") {
          onChange();
        }
      });
    });

    document.addEventListener("click", event => {
      if (!select.contains(event.target)) {
        select.classList.remove("open");
      }
    });
  }

  function bindInputs(onChange) {
    const ids = [
      "descriptionProblem",
      "workshopNumber",
      "floorNumber",
      "roomNumber"
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener("input", onChange);
      el.addEventListener("change", onChange);
    });
  }

  function bindCreate(handler) {
    btn.addEventListener("click", handler);
  }

  function showSuccessModal(onOk) {
    if (!elements.successModal) return;

    elements.successModal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    if (elements.successModalOk) {
      elements.successModalOk.onclick = () => {
        elements.successModal.classList.add("hidden");
        document.body.classList.remove("modal-open");

        if (typeof onOk === "function") {
          onOk();
        }
      };
    }
  }

  return {
    getFields,
    setMessage,
    setButtonDisabled,
    hideCreateButton,
    setCreatedBy,
    fillUserLocation,
    resetForm,
    initCustomSelect,
    bindInputs,
    bindCreate,
    showSuccessModal
  };
})();