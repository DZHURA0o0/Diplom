let ordersExpandedState = {};
let orderDetailsCache = {};

let bossWorkersMap = {};
let bossSpecialists = [];
let bossSpecialistsMap = {};
let bossPeopleLoaded = false;

const BOSS_DETAIL_REQUEST_STATUS_LABELS = {
    CREATED: "Очікує деталей",
    APPROVED: "Деталі отримано",
    REJECTED: "Відхилено",
    CANCELED: "Скасовано",
    WAITING: "Очікує деталей",
    RECEIVED: "Деталі отримано"
};

/* ===================== BASIC GETTERS ===================== */

function getWorkerId(order) {
    return order.workerId || order.worker_id || null;
}

function getSpecialistId(order) {
    return order.specialistId || order.specialist_id || null;
}

function getComplaint(order) {
    return order.complaint || null;
}

function getComplaintSubmitted(order) {
    const complaint = getComplaint(order);

    if (!complaint) {
        return !!order.complaintSubmitted;
    }

    if (typeof complaint.isSubmitted !== "undefined") return !!complaint.isSubmitted;
    if (typeof complaint.is_submitted !== "undefined") return !!complaint.is_submitted;
    if (typeof order.complaintSubmitted !== "undefined") return !!order.complaintSubmitted;

    return false;
}

function getComplaintStatus(order) {
    const complaint = getComplaint(order);
    const orderStatus = String(order.status || "").trim().toUpperCase();

    let status = null;

    if (complaint) {
        status = complaint.status || complaint.Status || null;
    }

    if (!status) {
        status = order.complaintStatus || null;
    }

    status = String(status || "").trim().toUpperCase();

    if (status === "OPEN") {
        return "SUBMITTED";
    }

    if (status) {
        return status;
    }

    if (!getComplaintSubmitted(order)) {
        return null;
    }

    const resolvedByReportId =
        complaint?.resolvedByReportId ||
        complaint?.resolved_by_report_id ||
        null;

    const closedAt =
        complaint?.closedAt ||
        complaint?.closed_at ||
        null;

    if (closedAt && resolvedByReportId) {
        return "RESOLVED";
    }

    if (closedAt && !resolvedByReportId) {
        return "REJECTED";
    }

    if (orderStatus === "REWORK_REVIEW") {
        return "REWORK_DONE";
    }

    if (resolvedByReportId && !closedAt) {
        return "REWORK_DONE";
    }

    if (orderStatus === "REWORK") {
        return "IN_REWORK";
    }

    if (orderStatus === "UNDER_COMPLAINT") {
        return "SUBMITTED";
    }

    return "SUBMITTED";
}

function getComplaintStatusLabel(order) {
    const status = getComplaintStatus(order);

    if (status === "SUBMITTED") return "Подана";
    if (status === "IN_REWORK") return "На переробці";
    if (status === "REWORK_DONE") return "Переробку завершено";
    if (status === "RESOLVED") return "Вирішена";
    if (status === "REJECTED") return "Відхилена";

    return status || "—";
}

function getWorkerName(order) {
    const workerId = getWorkerId(order);

    return order.workerFullName ||
        order.workerName ||
        order.worker_full_name ||
        order.worker_name ||
        bossWorkersMap[workerId] ||
        workerId ||
        "—";
}

function getSpecialistName(order) {
    const specialistId = getSpecialistId(order);

    return order.specialistFullName ||
        order.specialistName ||
        order.specialist_full_name ||
        order.specialist_name ||
        bossSpecialistsMap[specialistId] ||
        specialistId ||
        "—";
}

function getStatusBadge(order) {
    const status = String(order.status || "UNKNOWN").trim().toUpperCase();

    return `
        <span class="status-badge status-${escapeHtml(normalizeStatusClass(status))}">
            ${escapeHtml(formatStatusBadge(status))}
        </span>
    `;
}

function shortText(value, max = 60) {
    if (!value) return "—";

    const text = String(value);
    if (text.length <= max) return text;

    return text.slice(0, max).trim() + "…";
}

/* ===================== PEOPLE CACHE ===================== */

async function ensurePeopleLoaded() {
    if (bossPeopleLoaded) return;

    const [workers, specialists] = await Promise.all([
        fetchWorkers(),
        fetchSpecialists()
    ]);

    bossWorkersMap = {};
    bossSpecialistsMap = {};

    for (const worker of workers) {
        const id = worker.id || worker._id;
        if (!id) continue;

        bossWorkersMap[id] = worker.fullName || worker.full_name || worker.login || id;
    }

    bossSpecialists = specialists
        .map(specialist => ({
            id: specialist.id || specialist._id,
            fullName: specialist.fullName || specialist.full_name || specialist.login || "",
            login: specialist.login || "",
            accountStatus: specialist.accountStatus || specialist.account_status || "",
            roleInSystem: specialist.roleInSystem || specialist.role_in_system || ""
        }))
        .filter(x => x.id);

    for (const specialist of bossSpecialists) {
        bossSpecialistsMap[specialist.id] = specialist.fullName || specialist.login || specialist.id;
    }

    bossPeopleLoaded = true;
}

/* ===================== HTML HELPERS ===================== */

function createDetailsField(label, value, options = {}) {
    const fullClass = options.full ? " full" : "";
    const valueClass = options.valueClass ? ` ${options.valueClass}` : "";
    const safeValue = value === null || value === undefined || value === "" ? "—" : value;

    return `
        <div class="order-detail-field${fullClass}">
            <div class="order-detail-label">${escapeHtml(label)}</div>
            <div class="order-detail-value${valueClass}">${safeValue}</div>
        </div>
    `;
}

/* ===================== DETAIL REQUESTS ===================== */

function normalizeDetailRequest(item) {
    item = item || {};

    return {
        id: item.id || item.Id || "",
        detailNeeds: item.detailNeeds || item.DetailNeeds || "",
        explanation: item.explanation || item.Explanation || "",
        status: item.status || item.Status || "",
        createdAt: item.createdAt || item.CreatedAt || null,
        approvedAt: item.approvedAt || item.ApprovedAt || null,
        approvedBy: item.approvedBy || item.ApprovedBy || null
    };
}

function formatDetailRequestStatus(status) {
    const key = String(status || "").trim().toUpperCase();
    return BOSS_DETAIL_REQUEST_STATUS_LABELS[key] || status || "—";
}

function getDetailRequestStatusClass(status) {
    const key = String(status || "").trim().toUpperCase();

    if (key === "CREATED" || key === "WAITING") return "CREATED";
    if (key === "APPROVED" || key === "RECEIVED") return "APPROVED";
    if (key === "REJECTED") return "REJECTED";
    if (key === "CANCELED") return "CANCELED";

    return "UNKNOWN";
}

function getOrderDetailRequests(order) {
    const requests = order.detailRequests || order.DetailRequests || [];

    if (Array.isArray(requests) && requests.length > 0) {
        return requests
            .map(normalizeDetailRequest)
            .filter(x => x.id || x.detailNeeds || x.explanation)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    const oldNeeds = order.detailNeeds || order.DetailNeeds || "";
    const oldExplanation = order.detailExplanation || order.DetailExplanation || "";
    const oldStatus = order.detailRequestStatus || order.DetailRequestStatus || "";
    const oldId = order.detailRequestId || order.DetailRequestId || "";

    if (!oldNeeds && !oldExplanation && !oldId) {
        return [];
    }

    return [
        {
            id: oldId,
            detailNeeds: oldNeeds,
            explanation: oldExplanation,
            status: oldStatus,
            createdAt: null,
            approvedAt: null,
            approvedBy: null
        }
    ];
}

function buildDetailRequestsHtml(order) {
    const requests = getOrderDetailRequests(order);

    if (requests.length === 0) {
        return `
            <div class="boss-detail-request-empty">
                Запитів деталей ще немає.
            </div>
        `;
    }

    return `
        <div class="boss-detail-request-history">
            ${requests.map((request, index) => {
                const statusClass = getDetailRequestStatusClass(request.status);

                return `
                    <div class="boss-detail-request-item">
                        <div class="boss-detail-request-head">
                            <div>
                                <strong>Запит деталей ${requests.length - index}</strong>
                                <span>${escapeHtml(formatDate(request.createdAt))}</span>
                            </div>

                            <div class="boss-detail-request-status ${statusClass}">
                                ${escapeHtml(formatDetailRequestStatus(request.status))}
                            </div>
                        </div>

                        <div class="boss-detail-request-body">
                            <div class="boss-detail-request-row">
                                <span>Потрібні деталі</span>
                                <p>${escapeHtml(request.detailNeeds || "—")}</p>
                            </div>

                            <div class="boss-detail-request-row">
                                <span>Пояснення</span>
                                <p>${escapeHtml(request.explanation || "—")}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

/* ===================== REPORTS ===================== */

function buildReportsHtml(reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
        return "—";
    }

    return [...reports]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((report, index) => {
            const reportText = escapeHtml(report.reportText || report.text || "—");
            const createdAt = formatDate(report.createdAt);

            return `
                <div class="report-item">
                    <div class="report-item-head">
                        <span class="report-item-title">Звіт ${reports.length - index}</span>
                        <span class="report-item-date">${escapeHtml(createdAt)}</span>
                    </div>

                    <div class="report-item-body">${reportText}</div>
                </div>
            `;
        })
        .join("");
}

/* ===================== FULL ORDER DETAILS CACHE ===================== */

async function getFullOrderDetails(orderId) {
    if (!orderId) {
        throw new Error("Order id not found");
    }

    const cached = orderDetailsCache[orderId];

    if (cached?.__reportsLoaded) {
        return cached;
    }

    const [details, reports] = await Promise.all([
        cached ? Promise.resolve(cached) : fetchOrderDetails(orderId),
        fetchOrderReports(orderId)
    ]);

    const fullOrder = {
        ...details,
        id: details?.id || details?._id || orderId,
        reports: reports || [],
        __reportsLoaded: true
    };

    orderDetailsCache[orderId] = fullOrder;
    return fullOrder;
}

async function fetchFullOrderDetailsFresh(orderId) {
    if (!orderId) {
        throw new Error("Order id not found");
    }

    const [details, reports] = await Promise.all([
        fetchOrderDetails(orderId),
        fetchOrderReports(orderId)
    ]);

    const fullOrder = {
        ...details,
        id: details?.id || details?._id || orderId,
        reports: reports || [],
        __reportsLoaded: true
    };

    orderDetailsCache[orderId] = fullOrder;
    return fullOrder;
}

/* ===================== POINT UPDATE HELPERS ===================== */

function getCurrentBossTbodyId() {
    return activeTab === "complaints"
        ? "complaintsOrders"
        : "orders";
}

function findRenderedOrderPair(tbodyId, orderId) {
    const tbody = document.getElementById(tbodyId);

    if (!tbody) {
        return null;
    }

    const mainRows = Array.from(tbody.querySelectorAll("tr.main-row"));
    const mainRow = mainRows.find(row => row.dataset.orderId === String(orderId));

    if (!mainRow) {
        return null;
    }

    const detailsRow = mainRow.nextElementSibling;

    if (!detailsRow || !detailsRow.classList.contains("details-row")) {
        return null;
    }

    return {
        mainRow,
        detailsRow
    };
}

function shouldOrderStayVisibleInTable(order, tbodyId) {
    if (tbodyId === "complaintsOrders") {
        return isComplaintOrder(order);
    }

    const statusFilter = document.getElementById("statusFilter")?.value || "";

    if (!statusFilter) {
        return true;
    }

    return String(order.status || "").trim().toUpperCase() ===
        String(statusFilter).trim().toUpperCase();
}

function ensureBossTableEmptyState(tbodyId) {
    const tbody = document.getElementById(tbodyId);

    if (!tbody) {
        return;
    }

    const hasRows = tbody.querySelector("tr.main-row");

    if (hasRows) {
        return;
    }

    const message = tbodyId === "complaintsOrders"
        ? "Немає заявок зі скаргами"
        : "Немає заявок";

    tbody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-box">${escapeHtml(message)}</div>
            </td>
        </tr>
    `;
}

function adjustComplaintsBadge(delta) {
    const badge = document.getElementById("complaintsBadge");
    const tabComplaintsBtn = document.getElementById("tabComplaintsBtn");

    if (!badge || !delta) {
        return;
    }

    const currentValue = Number(badge.textContent || "0");
    const nextValue = Math.max(0, currentValue + delta);

    badge.textContent = String(nextValue);

    if (nextValue <= 0) {
        badge.classList.add("hidden");
        tabComplaintsBtn?.classList.remove("has-complaints");
        badge.title = "";
    } else {
        badge.classList.remove("hidden");
        tabComplaintsBtn?.classList.add("has-complaints");
        badge.title = `Активних скарг: ${nextValue}`;
    }
}

function createRenderedOrderRows(order, tbodyId = "orders") {
    const orderId = getOrderId(order);
    const rowStateKey = `${tbodyId}_${orderId}`;

    const mainRow = document.createElement("tr");
    mainRow.className = "main-row";
    mainRow.dataset.orderId = String(orderId);

    if (ordersExpandedState[rowStateKey]) {
        mainRow.classList.add("is-open");
    }

    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    detailsRow.dataset.orderId = String(orderId);

    if (!ordersExpandedState[rowStateKey]) {
        detailsRow.classList.add("hidden");
    }

    const description = order.descriptionProblem || order.description_problem || "";
    const complaintMark = getComplaintMarkHtml(order);

    mainRow.innerHTML = `
        <td class="cell-mono">
            ${escapeHtml(orderId || "—")}
            ${complaintMark}
            <span class="expand-mark">⌄</span>
        </td>

        <td>${escapeHtml(getWorkerName(order))}</td>
        <td>${escapeHtml(getSpecialistName(order))}</td>
        <td>${getStatusBadge(order)}</td>
        <td>${escapeHtml(formatServiceType(order.serviceType || order.service_type))}</td>

        <td class="cell-truncate" title="${escapeHtml(description)}">
            ${escapeHtml(shortText(description, 70))}
        </td>

        <td>${formatLocation(order)}</td>
        <td class="cell-actions"></td>
    `;

    const assignCell = mainRow.lastElementChild;
    assignCell.appendChild(createAssignControls(order));

    if (ordersExpandedState[rowStateKey]) {
        fillDetailsRow(order, detailsRow);
    }

    mainRow.addEventListener("click", async () => {
        const willOpen = detailsRow.classList.contains("hidden");

        if (willOpen) {
            detailsRow.classList.remove("hidden");
            mainRow.classList.add("is-open");
            ordersExpandedState[rowStateKey] = true;
            await fillDetailsRow(order, detailsRow);
        } else {
            detailsRow.classList.add("hidden");
            mainRow.classList.remove("is-open");
            delete ordersExpandedState[rowStateKey];
        }
    });

    return {
        mainRow,
        detailsRow
    };
}

async function updateRenderedOrderOnly(orderId, options = {}) {
    if (!orderId) {
        return;
    }

    const tbodyId = options.tbodyId || getCurrentBossTbodyId();
    const pair = findRenderedOrderPair(tbodyId, orderId);

    const freshOrder = await fetchFullOrderDetailsFresh(orderId);

    if (!shouldOrderStayVisibleInTable(freshOrder, tbodyId)) {
        if (pair) {
            pair.mainRow.remove();
            pair.detailsRow.remove();
            ensureBossTableEmptyState(tbodyId);
        }

        if (options.activeComplaintDelta) {
            adjustComplaintsBadge(options.activeComplaintDelta);
        }

        return;
    }

    if (!pair) {
        if (options.activeComplaintDelta) {
            adjustComplaintsBadge(options.activeComplaintDelta);
        }

        return;
    }

    const rowStateKey = `${tbodyId}_${orderId}`;
    const wasOpen = !pair.detailsRow.classList.contains("hidden");

    if (wasOpen) {
        ordersExpandedState[rowStateKey] = true;
    } else {
        delete ordersExpandedState[rowStateKey];
    }

    const newPair = createRenderedOrderRows(freshOrder, tbodyId);

    pair.mainRow.replaceWith(newPair.mainRow);
    pair.detailsRow.replaceWith(newPair.detailsRow);

    if (options.activeComplaintDelta) {
        adjustComplaintsBadge(options.activeComplaintDelta);
    }
}

/* ===================== COMPLAINT ACTIONS ===================== */

function buildComplaintActionsHtml(order) {
    const orderStatus = String(order.status || "").trim().toUpperCase();
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatus = getComplaintStatus(order);

    if (!complaintSubmitted) {
        return "";
    }

    if (
        complaintStatus === "SUBMITTED" &&
        (orderStatus === "UNDER_COMPLAINT" || orderStatus === "DONE")
    ) {
        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>

                <div class="complaint-actions-buttons">
                    <button type="button" class="btn-main js-complaint-rework">
                        На переробку
                    </button>

                    <button type="button" class="btn-secondary js-complaint-reject">
                        Відхилити скаргу
                    </button>
                </div>
            </div>
        `;
    }

    if (complaintStatus === "IN_REWORK" || orderStatus === "REWORK") {
        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>

                <div class="complaint-actions-note">
                    Скарга знаходиться на переробці. Закрити її можна тільки після завершення роботи спеціалістом.
                </div>
            </div>
        `;
    }

    if (complaintStatus === "REWORK_DONE" || orderStatus === "REWORK_REVIEW") {
        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>

                <div class="complaint-actions-buttons">
                    <button type="button" class="btn-main js-complaint-resolve">
                        Закрити скаргу
                    </button>
                </div>

                <div class="complaint-actions-note">
                    Переробку завершено. Начальник може перевірити результат і остаточно закрити заявку.
                </div>
            </div>
        `;
    }

    if (complaintStatus === "RESOLVED") {
        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>
                <div class="complaint-actions-note">Скаргу закрито.</div>
            </div>
        `;
    }

    if (complaintStatus === "REJECTED") {
        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>
                <div class="complaint-actions-note">Скаргу відхилено.</div>
            </div>
        `;
    }

    return "";
}

/* ===================== FULL ORDER DETAILS HTML ===================== */

function buildDetailsHtml(order) {
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatusLabel = getComplaintStatusLabel(order);
    const reportsHtml = buildReportsHtml(order.reports);
    const detailRequestsHtml = buildDetailRequestsHtml(order);

    return `
        <div class="order-details-grid">
            ${createDetailsField("ID заявки", escapeHtml(order.id || "—"), { valueClass: "mono" })}
            ${createDetailsField("Дата створення", formatDate(order.createdAt))}
            ${createDetailsField("Статус", escapeHtml(formatStatus(order.status || "—")))}
            ${createDetailsField("Тип заявки", escapeHtml(formatServiceType(order.serviceType)))}

            ${createDetailsField("ПІБ працівника", escapeHtml(order.workerFullName || order.workerName || "—"))}
            ${createDetailsField("Телефон працівника", escapeHtml(order.workerPhone || "—"))}
            ${createDetailsField("Посада працівника", escapeHtml(order.workerPosition || "—"))}

            ${createDetailsField("ПІБ спеціаліста", escapeHtml(order.specialistFullName || order.specialistName || "—"))}
            ${createDetailsField("Телефон спеціаліста", escapeHtml(order.specialistPhone || "—"))}
            ${createDetailsField("Посада спеціаліста", escapeHtml(order.specialistPosition || "—"))}

            ${createDetailsField("Цех", escapeHtml(order.productionWorkshopNumber ?? "—"))}
            ${createDetailsField("Поверх", escapeHtml(order.floorNumber ?? "—"))}
            ${createDetailsField("Кімната", escapeHtml(order.roomNumber ?? "—"))}

            ${createDetailsField("Опис проблеми", escapeHtml(order.descriptionProblem || "—"), { full: true, valueClass: "long-text" })}
            ${createDetailsField("Результат огляду", escapeHtml(order.inspectionResult || "—"), { full: true, valueClass: "long-text" })}

            ${createDetailsField("Історія запитів деталей", detailRequestsHtml, { full: true })}
            ${createDetailsField("Усі звіти", reportsHtml, { full: true, valueClass: "long-text" })}

            ${createDetailsField("Скарга подана", complaintSubmitted ? "Так" : "Ні")}
            ${createDetailsField("Статус скарги", escapeHtml(complaintStatusLabel || "—"))}
            ${createDetailsField("Текст скарги", escapeHtml(order.complaintText || "—"), { full: true, valueClass: "long-text" })}
        </div>

        ${buildComplaintActionsHtml(order)}
    `;
}

/* ===================== COMMON ACTION HELPERS ===================== */

async function refreshOrdersAfterAction(orderId, options = {}) {
    if (!orderId) {
        return;
    }

    await updateRenderedOrderOnly(orderId, options);
}

/* ===================== COMPLAINT HANDLERS ===================== */

function attachComplaintActionHandlers(order, detailsRow) {
    const orderId = getOrderId(order);
    if (!orderId) return;

    const reworkBtn = detailsRow.querySelector(".js-complaint-rework");
    const resolveBtn = detailsRow.querySelector(".js-complaint-resolve");
    const rejectBtn = detailsRow.querySelector(".js-complaint-reject");

    if (reworkBtn) {
        reworkBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const restore = setPendingButton(reworkBtn, "Обробка...");

            try {
                const result = await moveComplaintToRework(orderId);
                setStatus(result?.message || "Заявку переведено на переробку");
                await refreshOrdersAfterAction(orderId);
            } catch (err) {
                setStatus(err.message || "Не вдалося перевести заявку на переробку", true);
                restore?.();
            }
        });
    }

    if (resolveBtn) {
        resolveBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (resolveBtn.disabled) return;

            const restore = setPendingButton(resolveBtn, "Закриття...");

            try {
                const result = await resolveComplaint(
                    orderId,
                    "Скаргу закрито начальником після перевірки переробки"
                );

                setStatus(result?.message || "Скаргу закрито. Заявку остаточно виконано.");

                await refreshOrdersAfterAction(orderId, {
                    activeComplaintDelta: -1
                });
            } catch (err) {
                setStatus(err.message || "Не вдалося закрити скаргу", true);
                restore?.();
            }
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const restore = setPendingButton(rejectBtn, "Відхилення...");

            try {
                const result = await rejectComplaint(orderId, "Скаргу відхилено начальником");
                setStatus(result?.message || "Скаргу відхилено");

                await refreshOrdersAfterAction(orderId, {
                    activeComplaintDelta: -1
                });
            } catch (err) {
                setStatus(err.message || "Не вдалося відхилити скаргу", true);
                restore?.();
            }
        });
    }
}

/* ===================== ASSIGN CONTROLS ===================== */

function stopRowToggle(e) {
    e.stopPropagation();
}

function createAssignControls(order) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";
    wrap.addEventListener("click", stopRowToggle);

    const orderStatus = String(order.status || "").trim().toUpperCase();
    const orderId = getOrderId(order);

    if (!orderId) {
        const label = document.createElement("div");
        label.className = "btn-disabled";
        label.textContent = "Немає ID";
        wrap.appendChild(label);
        return wrap;
    }

    if (
        orderStatus === "DONE" ||
        orderStatus === "CANCELED" ||
        orderStatus === "UNDER_COMPLAINT" ||
        orderStatus === "REWORK_REVIEW"
    ) {
        const label = document.createElement("div");
        label.className = "btn-disabled";

        if (orderStatus === "DONE") {
            label.textContent = "Закрито";
        } else if (orderStatus === "UNDER_COMPLAINT") {
            label.textContent = "Оскарження";
        } else if (orderStatus === "REWORK_REVIEW") {
            label.textContent = "Очікує закриття";
        } else {
            label.textContent = "Заблоковано";
        }

        wrap.appendChild(label);
        return wrap;
    }

    const select = document.createElement("select");

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "-- виберіть спеціаліста --";
    select.appendChild(emptyOption);

    const currentSpecialistId = getSpecialistId(order);

    for (const specialist of bossSpecialists) {
        const option = document.createElement("option");
        option.value = specialist.id;
        option.textContent = specialist.fullName || specialist.login || specialist.id;

        if (currentSpecialistId && specialist.id === currentSpecialistId) {
            option.selected = true;
        }

        select.appendChild(option);
    }

    const btn = document.createElement("button");
    btn.className = "btn-main";
    btn.textContent = currentSpecialistId ? "Оновити" : "Призначити";

    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!select.value) {
            setStatus("Оберіть спеціаліста", true);
            return;
        }

        const restore = setPendingButton(btn, "Збереження...");

        try {
            const result = await assignSpecialist(orderId, select.value);
            setStatus(result?.message || "Спеціаліста оновлено");
            await refreshOrdersAfterAction(orderId);
        } catch (err) {
            setStatus(err.message || "Не вдалося оновити спеціаліста", true);
            restore?.();
        }
    };

    wrap.append(select, btn);

    return wrap;
}

/* ===================== RENDER ORDERS ===================== */

async function fillDetailsRow(order, detailsRow) {
    const orderId = getOrderId(order);

    if (!orderId) {
        detailsRow.innerHTML = `
            <td colspan="8">
                <div class="error-box">Order id not found</div>
            </td>
        `;
        return;
    }

    detailsRow.innerHTML = `
        <td colspan="8">
            <div class="empty-box">Завантаження повної інформації...</div>
        </td>
    `;

    try {
        const fullOrder = await getFullOrderDetails(orderId);

        detailsRow.innerHTML = `
            <td colspan="8">
                ${buildDetailsHtml(fullOrder)}
            </td>
        `;

        attachComplaintActionHandlers(fullOrder, detailsRow);
    } catch (err) {
        detailsRow.innerHTML = `
            <td colspan="8">
                <div class="error-box">${escapeHtml(err.message || "Details load error")}</div>
            </td>
        `;
    }
}

function getComplaintMarkHtml(order) {
    const complaintStatus = getComplaintStatus(order);
    const orderStatus = String(order.status || "").trim().toUpperCase();

    if (!getComplaintSubmitted(order)) {
        return "";
    }

    if (complaintStatus === "SUBMITTED" || orderStatus === "UNDER_COMPLAINT") {
        return `<span class="complaint-row-mark complaint-row-mark-red" title="Нова скарга">!</span>`;
    }

    if (complaintStatus === "IN_REWORK" || orderStatus === "REWORK") {
        return `<span class="complaint-row-mark complaint-row-mark-yellow" title="Скарга на переробці">!</span>`;
    }

    if (complaintStatus === "REWORK_DONE" || orderStatus === "REWORK_REVIEW") {
        return `<span class="complaint-row-mark complaint-row-mark-yellow" title="Переробку завершено, скаргу треба закрити">!</span>`;
    }

    return "";
}

function renderOrdersTable(orders, tbodyId = "orders") {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!orders.length) {
        const message = tbodyId === "complaintsOrders"
            ? "Немає заявок зі скаргами"
            : "Немає заявок";

        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8"><div class="empty-box">${escapeHtml(message)}</div></td>`;
        tbody.appendChild(tr);
        return;
    }

    for (const order of orders) {
        const pair = createRenderedOrderRows(order, tbodyId);
        tbody.append(pair.mainRow, pair.detailsRow);
    }
}

/* ===================== LOAD ORDERS ===================== */

async function loadOrders() {
    if (typeof activeTab !== "undefined" && activeTab !== "orders") return;

    const tbody = document.getElementById("orders");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-box">Завантаження...</div></td></tr>`;

    try {
        await ensurePeopleLoaded();

        const statusFilter = document.getElementById("statusFilter");
        const status = statusFilter ? statusFilter.value : "";

        const orders = await fetchOrders(status);
        const sorted = sortOrdersNewFirst(orders);

        renderOrdersTable(sorted, "orders");
        setStatus(`Завантажено ${sorted.length} заявок`);

        if (typeof updateComplaintsBadge === "function") {
            await updateComplaintsBadge();
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="error-box">${escapeHtml(err.message || "Load orders error")}</div>
                </td>
            </tr>
        `;

        setStatus(err.message || "Load orders error", true);
    }
}

/* ===================== COMPLAINTS TAB ===================== */

function isComplaintOrder(order) {
    return getComplaintSubmitted(order);
}

function isActiveComplaintOrder(order) {
    const complaintStatus = getComplaintStatus(order);
    const orderStatus = String(order.status || "").trim().toUpperCase();

    if (!getComplaintSubmitted(order)) return false;

    return complaintStatus === "SUBMITTED"
        || complaintStatus === "IN_REWORK"
        || complaintStatus === "REWORK_DONE"
        || orderStatus === "UNDER_COMPLAINT"
        || orderStatus === "REWORK"
        || orderStatus === "REWORK_REVIEW";
}

async function getOrdersWithDetailsForComplaints() {
    const orders = await fetchOrders("");

    const detailedOrders = await Promise.all(
        orders.map(async (order) => {
            const orderId = getOrderId(order);

            if (!orderId) {
                return order;
            }

            try {
                let details = orderDetailsCache[orderId];

                if (!details) {
                    details = await fetchOrderDetails(orderId);
                    orderDetailsCache[orderId] = details;
                }

                return {
                    ...order,
                    ...details
                };
            } catch (err) {
                console.warn("Complaint details load failed:", orderId, err);
                return order;
            }
        })
    );

    return detailedOrders;
}

async function loadComplaintsOrders() {
    if (typeof activeTab !== "undefined" && activeTab !== "complaints") return;

    const tbody = document.getElementById("complaintsOrders");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-box">Завантаження скарг...</div></td></tr>`;

    try {
        await ensurePeopleLoaded();

        const detailedOrders = await getOrdersWithDetailsForComplaints();
        const complaintOrders = sortOrdersNewFirst(detailedOrders.filter(isComplaintOrder));

        renderOrdersTable(complaintOrders, "complaintsOrders");
        setStatus(`Завантажено ${complaintOrders.length} заявок зі скаргами`);

        await updateComplaintsBadge(detailedOrders);
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="error-box">${escapeHtml(err.message || "Complaints load error")}</div>
                </td>
            </tr>
        `;

        setStatus(err.message || "Complaints load error", true);
    }
}

async function updateComplaintsBadge(prefetchedOrders = null) {
    const badge = document.getElementById("complaintsBadge");
    const tabComplaintsBtn = document.getElementById("tabComplaintsBtn");

    if (!badge) return;

    try {
        const orders = Array.isArray(prefetchedOrders)
            ? prefetchedOrders
            : await getOrdersWithDetailsForComplaints();

        const activeComplaintsCount = orders.filter(isActiveComplaintOrder).length;

        if (activeComplaintsCount <= 0) {
            badge.textContent = "0";
            badge.classList.add("hidden");
            tabComplaintsBtn?.classList.remove("has-complaints");
            badge.title = "";
            return;
        }

        badge.textContent = String(activeComplaintsCount);
        badge.classList.remove("hidden");
        tabComplaintsBtn?.classList.add("has-complaints");
        badge.title = `Активних скарг: ${activeComplaintsCount}`;
    } catch (err) {
        console.error("Complaints badge update error:", err);
    }
}