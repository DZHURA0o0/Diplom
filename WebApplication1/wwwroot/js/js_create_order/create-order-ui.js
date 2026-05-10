let selectedServiceType = "";

const createOrderUi = (() => {
  const elements = {
    btn: document.getElementById("btnCreateOrder"),
    msg: document.getElementById("msg"),
    createdBy: document.getElementById("createdBy"),

    descriptionProblem: document.getElementById("descriptionProblem"),
    workshopNumber: document.getElementById("workshopNumber"),
    floorNumber: document.getElementById("floorNumber"),
    roomNumber: document.getElementById("roomNumber"),

    serviceTypeText: document.getElementById("serviceTypeText"),
    serviceTypeSelect: document.getElementById("serviceTypeSelect"),

    successModal: document.getElementById("successModal"),
    successModalOk: document.getElementById("successModalOk")
  };

  function getElementValue(name) {
    return elements[name]?.value?.trim() ?? "";
  }

  function getNumberValue(name) {
    const rawValue = getElementValue(name);
    return rawValue === "" ? NaN : Number(rawValue);
  }

  function getFields() {
    return {
      serviceType: selectedServiceType,
      descriptionProblem: getElementValue("descriptionProblem"),
      workshopNumber: getNumberValue("workshopNumber"),
      floorNumber: getNumberValue("floorNumber"),
      roomNumber: getNumberValue("roomNumber")
    };
  }

  function setMessage(text, color = "") {
    if (!elements.msg) {
      return;
    }

    elements.msg.textContent = text || "";
    elements.msg.style.color = color || "";
  }

  function setButtonDisabled(disabled) {
    if (elements.btn) {
      elements.btn.disabled = Boolean(disabled);
    }
  }

  function setButtonText(text) {
    if (elements.btn) {
      elements.btn.textContent = text;
    }
  }

  function hideCreateButton() {
    if (elements.btn) {
      elements.btn.style.display = "none";
    }
  }

  function setCreatedBy(text) {
    if (elements.createdBy) {
      elements.createdBy.textContent = text || "";
    }
  }

  function fillNumberField(name, value) {
    if (
      elements[name] &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      elements[name].value = value;
    }
  }

  function fillUserLocation(data) {
    fillNumberField("workshopNumber", data?.workshopNumber);
    fillNumberField("floorNumber", data?.floorNumber);
    fillNumberField("roomNumber", data?.officeNumber);
  }

  function resetCustomSelect() {
    selectedServiceType = "";

    if (elements.serviceTypeText) {
      elements.serviceTypeText.textContent = "Оберіть тип заявки";
    }

    const options = elements.serviceTypeSelect?.querySelectorAll(".custom-option") || [];
    options.forEach(option => option.classList.remove("selected"));
  }

  function resetForm() {
    resetCustomSelect();

    if (elements.descriptionProblem) {
      elements.descriptionProblem.value = "";
    }
  }

  function closeCustomSelect() {
    elements.serviceTypeSelect?.classList.remove("open");
  }

  function toggleCustomSelect() {
    elements.serviceTypeSelect?.classList.toggle("open");
  }

  function selectCustomOption(option, onChange) {
    const options = elements.serviceTypeSelect?.querySelectorAll(".custom-option") || [];

    options.forEach(item => item.classList.remove("selected"));
    option.classList.add("selected");

    selectedServiceType = option.dataset.value || "";

    if (elements.serviceTypeText) {
      elements.serviceTypeText.textContent = option.textContent.trim();
    }

    closeCustomSelect();

    if (typeof onChange === "function") {
      onChange();
    }
  }

  function initCustomSelect(onChange) {
    const select = elements.serviceTypeSelect;

    if (!select) {
      return;
    }

    const trigger = select.querySelector(".custom-select-trigger");
    const options = select.querySelectorAll(".custom-option");

    trigger?.addEventListener("click", event => {
      event.stopPropagation();
      toggleCustomSelect();
    });

    options.forEach(option => {
      option.addEventListener("click", event => {
        event.stopPropagation();
        selectCustomOption(option, onChange);
      });
    });

    document.addEventListener("click", event => {
      if (!select.contains(event.target)) {
        closeCustomSelect();
      }
    });
  }

  function bindInputs(onChange) {
    [
      elements.descriptionProblem,
      elements.workshopNumber,
      elements.floorNumber,
      elements.roomNumber
    ].forEach(element => {
      if (!element) {
        return;
      }

      element.addEventListener("input", onChange);
      element.addEventListener("change", onChange);
    });
  }

  function bindCreate(handler) {
    elements.btn?.addEventListener("click", handler);
  }

  function showSuccessModal(onOk) {
    if (!elements.successModal) {
      if (typeof onOk === "function") {
        onOk();
      }

      return;
    }

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
    setButtonText,
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