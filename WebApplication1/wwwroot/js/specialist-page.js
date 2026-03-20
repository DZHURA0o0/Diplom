let specialistOrders = [];

// ===== Инициализация страницы =====
window.addEventListener("load", initSpecialistPage);

async function initSpecialistPage() {
    bindPanelActions();
    await loadOrders();
}

// ===== UI helpers =====
function setStatus(text, isError = false) {
    const el = document.getElementById("status");
    if (!el) return;

    el.innerText = text ?? "";
    el.style.color = isError ? "red" : "black";
}

function createCell(text) {
    const td = document.createElement("td");
    td.innerText = text ?? "";
    return td;
}

function shortText(text, maxLen = 70) {
    if (!text) return "";
    const value = String(text).trim();
    return value.length > maxLen ? value.slice(0, maxLen) + "..." : value;
}

function formatLocation(order) {
    return `Workshop ${order.productionWorkshopNumber}, Floor ${order.floorNumber}, Room ${order.roomNumber}`;
}

function sortOrders(orders) {
    const statusOrder = {
        ASSIGNED: 1,
        IN_PROGRESS: 2,
        INSPECTION: 3,
        WAITING_DETAILS: 4,
        EXECUTION: 5,
        DONE: 6,
        CANCELED: 7
    };

    return [...orders].sort((a, b) => {
        const aStatus = statusOrder[a.status] ?? 999;
        const bStatus = statusOrder[b.status] ?? 999;

        if (aStatus !== bStatus) {
            return aStatus - bStatus;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
    });
}

// ===== Action panel =====
function hideAllPanelBlocks() {
    const inspectionBlock = document.getElementById("inspectionBlock");
    const detailRequestBlock = document.getElementById("detailRequestBlock");
    const workReportBlock = document.getElementById("workReportBlock");

    if (inspectionBlock) inspectionBlock.style.display = "none";
    if (detailRequestBlock) detailRequestBlock.style.display = "none";
    if (workReportBlock) workReportBlock.style.display = "none";
}

function openPanel(title, orderId) {
    const actionPanel = document.getElementById("actionPanel");
    const panelTitle = document.getElementById("panelTitle");
    const panelOrderId = document.getElementById("panelOrderId");

    if (!actionPanel || !panelTitle || !panelOrderId) {
        setStatus("Action panel elements not found in HTML", true);
        return false;
    }

    actionPanel.style.display = "block";
    panelTitle.innerText = title;
    panelOrderId.value = orderId;

    hideAllPanelBlocks();
    return true;
}

function closePanel() {
    const actionPanel = document.getElementById("actionPanel");
    const panelTitle = document.getElementById("panelTitle");
    const panelOrderId = document.getElementById("panelOrderId");

    const inspectionResult = document.getElementById("inspectionResult");
    const detailNeeds = document.getElementById("detailNeeds");
    const explanation = document.getElementById("explanation");
    const workReport = document.getElementById("workReport");

    if (actionPanel) actionPanel.style.display = "none";
    if (panelTitle) panelTitle.innerText = "Action";
    if (panelOrderId) panelOrderId.value = "";

    if (inspectionResult) inspectionResult.value = "";
    if (detailNeeds) detailNeeds.value = "";
    if (explanation) explanation.value = "";
    if (workReport) workReport.value = "";

    hideAllPanelBlocks();
}

function bindPanelActions() {
    const btnClosePanel = document.getElementById("btnClosePanel");
    const btnSaveInspection = document.getElementById("btnSaveInspection");
    const btnSendDetailRequest = document.getElementById("btnSendDetailRequest");
    const btnFinishOrder = document.getElementById("btnFinishOrder");

    if (btnClosePanel) {
        btnClosePanel.addEventListener("click", closePanel);
    }

    if (btnSaveInspection) {
        btnSaveInspection.addEventListener("click", handleSaveInspection);
    }

    if (btnSendDetailRequest) {
        btnSendDetailRequest.addEventListener("click", handleSendDetailRequest);
    }

    if (btnFinishOrder) {
        btnFinishOrder.addEventListener("click", handleFinishOrder);
    }
}

// ===== Таблица действий =====
function createButton(text, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerText = text;
    btn.addEventListener("click", onClick);
    return btn;
}

function buildActionCell(order) {
    const td = document.createElement("td");

    if (order.status === "ASSIGNED") {
        td.appendChild(createButton("Приступить к работе", async () => {
            await handleStart(order.id);
        }));
        return td;
    }

    if (order.status === "IN_PROGRESS") {
        td.appendChild(createButton("Осмотр", () => {
            if (!openPanel("Inspection", order.id)) return;

            const inspectionBlock = document.getElementById("inspectionBlock");
            const inspectionResultInput = document.getElementById("inspectionResult");

            if (inspectionBlock) inspectionBlock.style.display = "block";
            if (inspectionResultInput) {
                inspectionResultInput.value = order.inspectionResult ?? "";
            }
        }));
        return td;
    }

    if (order.status === "INSPECTION") {
        td.appendChild(createButton("Запрос деталей", () => {
            if (!openPanel("Detail request", order.id)) return;

            const detailRequestBlock = document.getElementById("detailRequestBlock");
            if (detailRequestBlock) detailRequestBlock.style.display = "block";
        }));

        td.appendChild(document.createTextNode(" "));

        td.appendChild(createButton("К выполнению", async () => {
            await handleMoveToExecution(order.id);
        }));

        return td;
    }

    if (order.status === "WAITING_DETAILS") {
        td.appendChild(createButton("К выполнению", async () => {
            await handleMoveToExecution(order.id);
        }));
        return td;
    }

    if (order.status === "EXECUTION") {
        td.appendChild(createButton("Завершить", () => {
            if (!openPanel("Finish order", order.id)) return;

            const workReportBlock = document.getElementById("workReportBlock");
            if (workReportBlock) workReportBlock.style.display = "block";
        }));
        return td;
    }

    if (order.status === "DONE") {
        td.innerText = "Completed";
        return td;
    }

    if (order.status === "CANCELED") {
        td.innerText = "Canceled";
        return td;
    }

    td.innerText = "—";
    return td;
}

function buildRow(order) {
    const tr = document.createElement("tr");

    const workerName = order.workerName ?? order.workerId ?? "—";

    tr.appendChild(createCell(order.id));
    tr.appendChild(createCell(workerName));
    tr.appendChild(createCell(order.status));
    tr.appendChild(createCell(order.serviceType));
    tr.appendChild(createCell(shortText(order.descriptionProblem)));
    tr.appendChild(createCell(formatLocation(order)));
    tr.appendChild(buildActionCell(order));

    return tr;
}

// ===== Загрузка заявок =====
async function loadOrders() {
    try {
        setStatus("Loading...");

        const statusFilter = document.getElementById("statusFilter");
        const status = statusFilter ? statusFilter.value : "";

        const orders = await fetchSpecialistOrders(status);
        specialistOrders = sortOrders(orders);

        const body = document.getElementById("orders");
        if (!body) {
            setStatus("Orders table body not found", true);
            return;
        }

        body.innerHTML = "";

        if (specialistOrders.length === 0) {
            setStatus("No orders");
            return;
        }

        specialistOrders.forEach(order => {
            body.appendChild(buildRow(order));
        });

        setStatus(`Loaded ${specialistOrders.length} orders`);
    }
    catch (e) {
        console.error(e);
        setStatus("Load error: " + e.message, true);
    }
}

// ===== Действия специалиста =====
async function handleStart(orderId) {
    try {
        setStatus("Saving...");
        await startSpecialistOrder(orderId);
        setStatus("Order moved to IN_PROGRESS");
        await loadOrders();
    }
    catch (e) {
        console.error(e);
        setStatus("Start error: " + e.message, true);
    }
}

async function handleSaveInspection() {
    try {
        const panelOrderId = document.getElementById("panelOrderId");
        const inspectionResultInput = document.getElementById("inspectionResult");

        if (!panelOrderId || !inspectionResultInput) {
            setStatus("Inspection form elements not found in HTML", true);
            return;
        }

        const orderId = panelOrderId.value;
        const inspectionResult = inspectionResultInput.value.trim();

        if (!inspectionResult) {
            setStatus("Inspection result is required", true);
            return;
        }

        setStatus("Saving inspection...");
        await saveInspection(orderId, inspectionResult);

        closePanel();
        setStatus("Inspection saved");
        await loadOrders();
    }
    catch (e) {
        console.error(e);
        setStatus("Inspection error: " + e.message, true);
    }
}

async function handleSendDetailRequest() {
    try {
        const panelOrderId = document.getElementById("panelOrderId");
        const detailNeedsInput = document.getElementById("detailNeeds");
        const explanationInput = document.getElementById("explanation");

        if (!panelOrderId || !detailNeedsInput || !explanationInput) {
            setStatus("Detail request form elements not found in HTML", true);
            return;
        }

        const orderId = panelOrderId.value;
        const detailNeeds = detailNeedsInput.value.trim();
        const explanation = explanationInput.value.trim();

        if (!detailNeeds) {
            setStatus("Detail needs is required", true);
            return;
        }

        if (!explanation) {
            setStatus("Explanation is required", true);
            return;
        }

        setStatus("Sending detail request...");
        await sendDetailRequest(orderId, detailNeeds, explanation);

        closePanel();
        setStatus("Detail request sent");
        await loadOrders();
    }
    catch (e) {
        console.error(e);
        setStatus("Detail request error: " + e.message, true);
    }
}

async function handleMoveToExecution(orderId) {
    try {
        setStatus("Saving...");
        await moveToExecution(orderId);
        setStatus("Order moved to EXECUTION");
        await loadOrders();
    }
    catch (e) {
        console.error(e);
        setStatus("Execution move error: " + e.message, true);
    }
}

async function handleFinishOrder() {
    try {
        const panelOrderId = document.getElementById("panelOrderId");
        const workReportInput = document.getElementById("workReport");

        if (!panelOrderId || !workReportInput) {
            setStatus("Finish form elements not found in HTML", true);
            return;
        }

        const orderId = panelOrderId.value;
        const workReport = workReportInput.value.trim();

        if (!workReport) {
            setStatus("Work report is required", true);
            return;
        }

        setStatus("Saving report...");
        await finishSpecialistOrder(orderId, workReport);

        closePanel();
        setStatus("Order completed");
        await loadOrders();
    }
    catch (e) {
        console.error(e);
        setStatus("Finish error: " + e.message, true);
    }
}