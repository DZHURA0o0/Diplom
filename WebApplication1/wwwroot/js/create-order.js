requireRole(["WORKER"]);

let isCreating = false;

const btn = document.getElementById("btnCreateOrder");
const msg = document.getElementById("msg");
const createdBy = document.getElementById("createdBy");

const inputIds = [
  "serviceType",
  "descriptionProblem",
  "workshopNumber",
  "floorNumber",
  "roomNumber"
];

function getFields() {
  return {
    serviceType: document.getElementById("serviceType").value,
    descriptionProblem: document.getElementById("descriptionProblem").value.trim(),
    workshopNumber: parseInt(document.getElementById("workshopNumber").value, 10),
    floorNumber: parseInt(document.getElementById("floorNumber").value, 10),
    roomNumber: parseInt(document.getElementById("roomNumber").value, 10)
  };
}

function validate(showMessage = true) {
  const f = getFields();

  const rules = [
    [() => !f.serviceType, "Select Service Type"],
    [() => !f.descriptionProblem || f.descriptionProblem.length < 5, "Description must be at least 5 characters"],
    [() => Number.isNaN(f.workshopNumber) || f.workshopNumber < 0, "Invalid Workshop Number"],
    [() => Number.isNaN(f.floorNumber) || f.floorNumber < 0, "Invalid Floor Number"],
    [() => Number.isNaN(f.roomNumber) || f.roomNumber < 0, "Invalid Room Number"]
  ];

  const error = rules.find(r => r[0]());

  if (error) {
    btn.disabled = true;
    if (showMessage) {
      msg.style.color = "red";
      msg.textContent = error[1];
    }
    return false;
  }

  if (!isCreating) {
    btn.disabled = false;
  }

  if (showMessage) {
    msg.textContent = "";
  }

  return true;
}

async function loadCurrentUser() {
  const token = localStorage.getItem("token");

  if (!token) {
    createdBy.textContent = "not authorized";
    msg.style.color = "red";
    msg.textContent = "No token found";
    return;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      createdBy.textContent = "failed to load user";
      msg.style.color = "red";
      msg.textContent = "Failed to load current user: " + res.status;
      validate(false);
      return;
    }

    const data = await res.json();

    createdBy.textContent = `${data.fullName ?? data.login ?? "unknown"} (${data.role ?? "no role"})`;

    if (data.workshopNumber !== undefined && data.workshopNumber !== null) {
      document.getElementById("workshopNumber").value = data.workshopNumber;
    }

    if (data.floorNumber !== undefined && data.floorNumber !== null) {
      document.getElementById("floorNumber").value = data.floorNumber;
    }

    if (data.officeNumber !== undefined && data.officeNumber !== null) {
      document.getElementById("roomNumber").value = data.officeNumber;
    }

    validate(false);
  } catch (e) {
    createdBy.textContent = "failed to load user";
    msg.style.color = "red";
    msg.textContent = "Failed to load current user";
    validate(false);
  }
}

async function createOrder() {
  if (isCreating) return;
  if (!validate(true)) return;

  const token = localStorage.getItem("token");

  if (!token) {
    msg.style.color = "red";
    msg.textContent = "No token found";
    return;
  }

  const data = getFields();

  try {
    isCreating = true;
    btn.disabled = true;
    msg.style.color = "black";
    msg.textContent = "Creating order...";

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    let text = await res.text();

    try {
      const json = JSON.parse(text);
      text = json.message ?? text;
    } catch {}

    if (!res.ok) {
      msg.style.color = "red";
      msg.textContent = text || ("Error " + res.status);
      isCreating = false;
      validate(false);
      return;
    }

    msg.style.color = "green";
    msg.textContent = "✔ Order created successfully";

    btn.style.display = "none";

    let seconds = 2;

    const timer = setInterval(() => {
      msg.textContent = "✔ Order created successfully. Redirecting in " + seconds + "...";
      seconds--;

      if (seconds < 0) {
        clearInterval(timer);
        window.location.href = "/workerPage.html";
      }
    }, 1000);
  } catch (e) {
    msg.style.color = "red";
    msg.textContent = "Network error: " + e;
    isCreating = false;
    validate(false);
  }
}

inputIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("input", () => validate(false));
    el.addEventListener("change", () => validate(false));
  }
});

validate(false);
loadCurrentUser();