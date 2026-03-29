let workersMap = {};
let specialists = [];
let specialistsMap = {};

function shortText(text, maxLen = 70) {
    if (!text) return "";
    const value = String(text).trim();
    return value.length > maxLen ? value.slice(0, maxLen) + "..." : value;
}

function formatLocation(order) {
    return `Workshop ${order.productionWorkshopNumber}, Floor ${order.floorNumber}, Room ${order.roomNumber}`;
}

async function loadPeople() {
    const [workers, loadedSpecialists] = await Promise.all([
        fetchWorkers(),
        fetchSpecialists()
    ]);

    specialists = loadedSpecialists;
    workersMap = Object.fromEntries(workers.map(x => [x.id, x.fullName]));
    specialistsMap = Object.fromEntries(
        specialists.map(x => [
            x.id,
            x.accountStatus === "INACTIVE"
                ? `${x.fullName} (INACTIVE)`
                : x.fullName
        ])
    );
}

function sortOrders(orders) {
    const statusOrder = {
        NEW: 1,
        ASSIGNED: 2,
        IN_PROGRESS: 3,
        INSPECTION: 4,
        WAITING_DETAILS: 5,
        EXECUTION: 6,
        DONE: 7,
        CANCELED: 8
    };

    return [...orders].sort((a, b) => {
        const aAssigned = a.specialistId ? 1 : 0;
        const bAssigned = b.specialistId ? 1 : 0;

        if (aAssigned !== bAssigned) return aAssigned - bAssigned;

        const aStatus = statusOrder[a.status] ?? 999;
        const bStatus = statusOrder[b.status] ?? 999;

        if (aStatus !== bStatus) return aStatus - bStatus;

        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

function updateActionButton(order, select, button) {
    const initialId = select.dataset.initialSpecialistId ?? "";
    const selectedId = select.value ?? "";
    const editMode = select.dataset.editMode === "true";

    if (order.status === "NEW" && !initialId) {
        button.innerText = "Assign";
        button.dataset.mode = "assign";
        return;
    }

    if (order.status !== "NEW" && !editMode) {
        button.innerText = "Update";
        button.dataset.mode = "unlock";
        return;
    }

    if (selectedId === initialId) {
        button.innerText = "Update";
        button.dataset.mode = "update";
        return;
    }

    button.innerText = "Confirm";
    button.dataset.mode = "confirm";
}

function buildSpecialistControl(order) {
    const wrap = document.createElement("div");

    const select = document.createElement("select");
    select.dataset.initialSpecialistId = order.specialistId ?? "";
    select.dataset.editMode = "false";

    select.appendChild(new Option("-- choose specialist --", ""));

    specialists.forEach(s => {
        const label = s.accountStatus === "INACTIVE"
            ? `${s.fullName} (INACTIVE)`
            : s.fullName;

        const option = new Option(label, s.id);

        if (order.specialistId === s.id) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    if (order.specialistId && !specialists.some(s => s.id === order.specialistId)) {
        const fallbackOption = new Option("Unknown specialist (INACTIVE)", order.specialistId);
        fallbackOption.selected = true;
        select.appendChild(fallbackOption);
    }

    if (order.status !== "NEW") {
        select.disabled = true;
    }

    const button = document.createElement("button");
    updateActionButton(order, select, button);

    select.addEventListener("change", function () {
        updateActionButton(order, select, button);
    });

    button.addEventListener("click", async function () {
        await handleAssign(order, select, button);
    });

    wrap.append(select, document.createTextNode(" "), button);
    return wrap;
}

function buildOrderRow(order) {
    const tr = document.createElement("tr");

    const workerName = workersMap[order.workerId] ?? order.workerId;
    const specialistName = order.specialistId
        ? (specialistsMap[order.specialistId] ?? order.specialistId)
        : "—";

    tr.appendChild(createCell(order.id));
    tr.appendChild(createCell(workerName));
    tr.appendChild(createCell(specialistName));
    tr.appendChild(createCell(order.status));
    tr.appendChild(createCell(order.serviceType));
    tr.appendChild(createCell(shortText(order.descriptionProblem)));
    tr.appendChild(createCell(formatLocation(order)));

    const actionTd = document.createElement("td");
    actionTd.appendChild(buildSpecialistControl(order));
    tr.appendChild(actionTd);

    return tr;
}

async function loadOrders() {
    if (activeTab !== "orders") return;

    try {
        setStatus("Loading orders...");

        if (specialists.length === 0 || Object.keys(workersMap).length === 0) {
            await loadPeople();
        }

        const status = document.getElementById("statusFilter")?.value ?? "";
        const orders = await fetchOrders(status);
        const sorted = sortOrders(orders);

        const body = document.getElementById("orders");
        if (!body) return;

        body.innerHTML = "";

        if (sorted.length === 0) {
            setStatus("No orders");
            return;
        }

        sorted.forEach(order => {
            body.appendChild(buildOrderRow(order));
        });

        setStatus("Loaded " + sorted.length + " orders");
    }
    catch (e) {
        console.error(e);
        setStatus("Orders load error: " + e.message, true);
    }
}

async function handleAssign(order, select, button) {
    try {
        const selectedId = select.value;
        const initialId = select.dataset.initialSpecialistId ?? "";
        const mode = button.dataset.mode ?? "";

        if (mode === "unlock") {
            select.disabled = false;
            select.dataset.editMode = "true";
            updateActionButton(order, select, button);
            setStatus("Edit mode enabled");
            return;
        }

        if (mode === "update") {
            setStatus("Choose another specialist or clear selection");
            return;
        }

        let confirmText = "";

        if (!initialId && selectedId) {
            confirmText = "Assign specialist to this order?";
        } else if (initialId && !selectedId) {
            confirmText = "Remove specialist and return order to NEW status?";
        } else if (initialId && selectedId && initialId !== selectedId) {
            confirmText = "Update specialist for this order?";
        } else {
            setStatus("No changes");
            return;
        }

        if (!confirm(confirmText)) return;

        setStatus("Saving...");
        await assignSpecialist(order.id, selectedId);

        await loadOrders();
        setStatus("Saved");
    }
    catch (e) {
        console.error(e);
        setStatus("Assign error: " + e.message, true);
    }
}