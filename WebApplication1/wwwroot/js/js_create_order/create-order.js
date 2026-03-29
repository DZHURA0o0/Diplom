requireRole(["WORKER"]);

let isCreating = false;

function validate(showMessage = true) {
  const f = createOrderUi.getFields();

  const rules = [
    [() => !f.serviceType, "Select Service Type"],
    [() => !f.descriptionProblem || f.descriptionProblem.length < 5, "Description must be at least 5 characters"],
    [() => Number.isNaN(f.workshopNumber) || f.workshopNumber < 0, "Invalid Workshop Number"],
    [() => Number.isNaN(f.floorNumber) || f.floorNumber < 0, "Invalid Floor Number"],
    [() => Number.isNaN(f.roomNumber) || f.roomNumber < 0, "Invalid Room Number"]
  ];

  const error = rules.find(rule => rule[0]());

  if (error) {
    createOrderUi.setButtonDisabled(true);

    if (showMessage) {
      createOrderUi.setMessage(error[1], "red");
    }

    return false;
  }

  if (!isCreating) {
    createOrderUi.setButtonDisabled(false);
  }

  if (showMessage) {
    createOrderUi.setMessage("");
  }

  return true;
}

async function handleLoadCurrentUser() {
  const result = await createOrderService.loadCurrentUser();

  if (!result.ok) {
    createOrderUi.setCreatedBy("failed to load user");
    createOrderUi.setMessage(result.error, "red");
    validate(false);
    return;
  }

  const data = result.data;

  createOrderUi.setCreatedBy(
    `${data.fullName ?? data.login ?? "unknown"} (${data.role ?? "no role"})`
  );

  createOrderUi.fillUserLocation(data);
  validate(false);
}

async function handleCreateOrder() {
  if (isCreating) return;
  if (!validate(true)) return;

  const data = createOrderUi.getFields();

  isCreating = true;
  createOrderUi.setButtonDisabled(true);
  createOrderUi.setMessage("Creating order...", "#ffffff");

  const result = await createOrderService.createOrder(data);

  if (!result.ok) {
    isCreating = false;
    createOrderUi.setMessage(result.error, "red");
    validate(false);
    return;
  }

  createOrderUi.setMessage("");
  createOrderUi.hideCreateButton();
  createOrderUi.showSuccessModal(() => {
    window.location.href = "/workerPage.html";
  });
}

function initCreateOrderPage() {
  createOrderUi.initCustomSelect(() => validate(false));
  createOrderUi.bindInputs(() => validate(false));
  createOrderUi.bindCreate(handleCreateOrder);

  validate(false);
  handleLoadCurrentUser();
}

document.addEventListener("DOMContentLoaded", initCreateOrderPage);