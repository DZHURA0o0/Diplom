let ordersExpandedState = {};
let orderDetailsCache = {};

let bossWorkers = [];
let bossWorkersMap = {};
let bossSpecialists = [];
let bossSpecialistsMap = {};
let bossPeopleLoaded = false;

let bossAssignedSpecialistUiState = {};

const BOSS_DETAIL_REQUEST_STATUS_LABELS = {
    CREATED: "Надіслано",
    RESERVED: "Зарезервовано",
    APPROVED: "Видано",
    CANCELED: "Скасовано"
};

const STATUS_LABELS = {
    NEW: "Нова",
    ASSIGNED: "Призначена",
    IN_PROGRESS: "У роботі",
    INSPECTION: "Огляд",
    WAITING_DETAILS: "Очікує деталей",
    DETAILS_RECEIVED: "Матеріал видано",
    EXECUTION: "Виконання",
    UNDER_COMPLAINT: "Під скаргою",
    REWORK: "На переробці",
    REWORK_REVIEW: "Перероблено",
    DONE: "Виконана",
    CANCELED: "Скасована"
};

const SERVICE_TYPE_LABELS = {
    ELECTRICAL: "Електроживлення / електрика",
    PC_PROBLEM: "Проблема з комп’ютером",
    PRINTER_PROBLEM: "Проблема з принтером",
    CARTRIDGE_REFILL: "Заправка картриджа",
    SOFTWARE_BUG: "Баг програмного забезпечення",
    INTERNET: "Інтернет / мережа",
    SEAL_DAMAGE: "Відсутня пломба / пошкоджена",
    AUDIO_VIDEO: "Проблема з відео/аудіо обладнанням",
    PLUMBING: "Сантехніка",
    HEATING: "Опалення",
    OTHER: "Інше"
};

/* ===================== COMMON ===================== */

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeBossId(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "object") {
        return String(
            value.id ||
            value.Id ||
            value._id ||
            value.$oid ||
            ""
        ).trim();
    }

    return String(value).trim();
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return date.toLocaleString("uk-UA");
}

function localizeStatus(status) {
    const key = String(status || "").trim().toUpperCase();
    return STATUS_LABELS[key] || status || "—";
}

function formatServiceType(value) {
    const key = String(value || "").trim().toUpperCase();
    return SERVICE_TYPE_LABELS[key] || value || "—";
}

function normalizeStatusClass(status) {
    return String(status || "UNKNOWN")
        .trim()
        .toUpperCase();
}

function formatLocation(order) {
    const workshop =
        order.productionWorkshopNumber ??
        order.workshopNumber ??
        order.production_workshop_number ??
        "—";

    const floor =
        order.floorNumber ??
        order.floor_number ??
        "—";

    const room =
        order.roomNumber ??
        order.officeNumber ??
        order.room_number ??
        order.office_number ??
        "—";

    return `Цех ${workshop}, Поверх ${floor}, Кімната ${room}`;
}

function shortText(value, max = 60) {
    if (!value) return "—";

    const text = String(value);

    if (text.length <= max) {
        return text;
    }

    return text.slice(0, max).trim() + "…";
}

function stopRowToggle(e) {
    e.stopPropagation();
}

function setPendingButton(button, pendingText) {
    if (!button) return null;

    const original = button.textContent;

    button.disabled = true;
    button.dataset.originalText = original;
    button.textContent = pendingText;

    return () => {
        button.disabled = false;
        button.textContent = button.dataset.originalText || original;
    };
}

/* ===================== ORDER FIELD HELPERS ===================== */

function getOrderId(order) {
    return normalizeBossId(
        order.id ||
        order.Id ||
        order._id ||
        order.orderId ||
        order.order_id
    ) || null;
}

function getWorkerId(order) {
    return normalizeBossId(
        order.workerId ||
        order.WorkerId ||
        order.worker_id ||
        order.worker?.id ||
        order.worker?.Id ||
        order.worker?._id
    ) || null;
}

function getSpecialistIdFromOrderOnly(order) {
    return normalizeBossId(
        order.specialistId ||
        order.SpecialistId ||
        order.specialist_id ||
        order.specialist?.id ||
        order.specialist?.Id ||
        order.specialist?._id
    );
}

function getSpecialistId(order) {
    const fromOrder = getSpecialistIdFromOrderOnly(order);

    if (fromOrder) {
        return fromOrder;
    }

    const orderId = getOrderId(order);

    if (orderId && bossAssignedSpecialistUiState[orderId]) {
        return bossAssignedSpecialistUiState[orderId];
    }

    return "";
}

function getOrderStatus(order) {
    return String(order.status || order.Status || "UNKNOWN")
        .trim()
        .toUpperCase();
}

function getWorkerName(order) {
    const directName =
        order.workerFullName ||
        order.workerName ||
        order.worker_full_name ||
        order.worker_name ||
        order.worker?.fullName ||
        order.worker?.full_name ||
        order.worker?.FullName;

    if (directName) {
        return directName;
    }

    const workerId = getWorkerId(order);

    if (!workerId) {
        return "—";
    }

    return bossWorkersMap[workerId] || workerId;
}

function getSpecialistName(order) {
    const directName =
        order.specialistFullName ||
        order.specialistName ||
        order.specialist_full_name ||
        order.specialist_name ||
        order.specialist?.fullName ||
        order.specialist?.full_name ||
        order.specialist?.FullName;

    if (directName) {
        return directName;
    }

    const specialistId = getSpecialistId(order);

    if (!specialistId) {
        return "—";
    }

    return bossSpecialistsMap[specialistId] || specialistId;
}

function getStatusBadge(order) {
    const status = getOrderStatus(order);

    return `
        <span class="status-badge status-${escapeHtml(normalizeStatusClass(status))}">
            ${escapeHtml(localizeStatus(status))}
        </span>
    `;
}

/* ===================== PEOPLE ===================== */

async function ensurePeopleLoaded(force = false) {
    if (bossPeopleLoaded && !force) return;

    const [workers, specialists] = await Promise.all([
        fetchWorkers(),
        fetchSpecialists()
    ]);

    bossWorkers = workers
        .map(worker => {
            const id = normalizeBossId(worker.id || worker.Id || worker._id);

            return {
                id,
                fullName:
                    worker.fullName ||
                    worker.FullName ||
                    worker.full_name ||
                    worker.login ||
                    worker.Login ||
                    id,
                login:
                    worker.login ||
                    worker.Login ||
                    "",
                accountStatus:
                    worker.accountStatus ||
                    worker.account_status ||
                    ""
            };
        })
        .filter(x => x.id);

    bossWorkersMap = {};

    for (const worker of bossWorkers) {
        bossWorkersMap[worker.id] =
            worker.fullName ||
            worker.login ||
            worker.id;
    }

    bossSpecialists = specialists
        .map(specialist => {
            const id = normalizeBossId(
                specialist.id ||
                specialist.Id ||
                specialist._id
            );

            return {
                id,
                fullName:
                    specialist.fullName ||
                    specialist.FullName ||
                    specialist.full_name ||
                    specialist.login ||
                    specialist.Login ||
                    id,
                login:
                    specialist.login ||
                    specialist.Login ||
                    "",
                accountStatus:
                    specialist.accountStatus ||
                    specialist.account_status ||
                    "",
                roleInSystem:
                    specialist.roleInSystem ||
                    specialist.role_in_system ||
                    ""
            };
        })
        .filter(x => x.id);

    bossSpecialistsMap = {};

    for (const specialist of bossSpecialists) {
        bossSpecialistsMap[specialist.id] =
            specialist.fullName ||
            specialist.login ||
            specialist.id;
    }

    bossPeopleLoaded = true;
}

function getOrderPeopleFilterRole() {
    return String(document.getElementById("orderPersonRoleFilter")?.value || "")
        .trim()
        .toUpperCase();
}

function getOrderPeopleFilterId() {
    return normalizeBossId(document.getElementById("orderPersonFilter")?.value || "");
}

function getBossPeopleOptions(role) {
    return role === "WORKER" ? bossWorkers : bossSpecialists;
}

function updateOrderPeopleFilterOptions() {
    const role = getOrderPeopleFilterRole();
    const personSelect = document.getElementById("orderPersonFilter");

    if (!personSelect) {
        return;
    }

    const selectedPersonId = normalizeBossId(personSelect.value || "");

    personSelect.innerHTML = "";
    personSelect.appendChild(new Option("Усі", ""));

    if (!role) {
        personSelect.classList.add("hidden");
        personSelect.value = "";
        return;
    }

    const people = getBossPeopleOptions(role)
        .map(person => ({
            id: normalizeBossId(person.id || person._id),
            fullName: person.fullName || person.full_name || person.login || "—",
            accountStatus: person.accountStatus || person.account_status || ""
        }))
        .filter(person => person.id)
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "uk"));

    for (const person of people) {
        const label = person.accountStatus === "INACTIVE"
            ? `${person.fullName} (неактивний)`
            : person.fullName;

        personSelect.appendChild(new Option(label, person.id));
    }

    if (selectedPersonId && people.some(person => person.id === selectedPersonId)) {
        personSelect.value = selectedPersonId;
    }

    personSelect.classList.remove("hidden");
}

async function refreshOrderPeopleFilterOptions() {
    await ensurePeopleLoaded();
    updateOrderPeopleFilterOptions();
}

function matchesOrderPeopleFilter(order) {
    const role = getOrderPeopleFilterRole();
    const personId = getOrderPeopleFilterId();

    if (!role) {
        return true;
    }

    if (!personId) {
        return true;
    }

    const orderPersonId = role === "WORKER"
        ? getWorkerId(order)
        : getSpecialistId(order);

    return normalizeBossId(orderPersonId) === personId;
}

function filterOrdersByBossFilters(orders) {
    return orders.filter(matchesOrderPeopleFilter);
}

/* ===================== COMPLAINT HELPERS ===================== */

function getComplaint(order) {
    return order.complaint || order.Complaint || null;
}

function getComplaintSubmitted(order) {
    const complaint = getComplaint(order);

    if (!complaint) {
        return Boolean(
            order.complaintSubmitted ||
            order.isComplaintSubmitted ||
            order.complaint_submitted
        );
    }

    if (typeof complaint.isSubmitted !== "undefined") {
        return Boolean(complaint.isSubmitted);
    }

    if (typeof complaint.IsSubmitted !== "undefined") {
        return Boolean(complaint.IsSubmitted);
    }

    if (typeof complaint.is_submitted !== "undefined") {
        return Boolean(complaint.is_submitted);
    }

    if (typeof order.complaintSubmitted !== "undefined") {
        return Boolean(order.complaintSubmitted);
    }

    return false;
}

function getComplaintStatus(order) {
    const complaint = getComplaint(order);
    const orderStatus = getOrderStatus(order);

    let status = null;

    if (complaint) {
        status =
            complaint.status ||
            complaint.Status ||
            complaint.complaintStatus ||
            complaint.complaint_status ||
            null;
    }

    if (!status) {
        status =
            order.complaintStatus ||
            order.complaint_status ||
            null;
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
        complaint?.ResolvedByReportId ||
        complaint?.resolved_by_report_id ||
        null;

    const closedAt =
        complaint?.closedAt ||
        complaint?.ClosedAt ||
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
    if (status === "REWORK_DONE") return "Перероблено";
    if (status === "RESOLVED") return "Вирішена";
    if (status === "REJECTED") return "Відхилена";

    return status || "—";
}

function getComplaintText(order) {
    const complaint = getComplaint(order);

    return (
        order.complaintText ||
        order.complaint_text ||
        complaint?.text ||
        complaint?.Text ||
        complaint?.complaintText ||
        complaint?.complaint_text ||
        "—"
    );
}

function getComplaintResolvedByReportId(order) {
    const complaint = getComplaint(order);

    return (
        order.resolvedByReportId ||
        order.resolved_by_report_id ||
        complaint?.resolvedByReportId ||
        complaint?.ResolvedByReportId ||
        complaint?.resolved_by_report_id ||
        ""
    );
}

function getComplaintMarkHtml(order) {
    if (!getComplaintSubmitted(order)) {
        return "";
    }

    const status = getOrderStatus(order);
    const complaintStatus = getComplaintStatus(order);
    const resolvedByReportId = getComplaintResolvedByReportId(order);

    const isRework =
        status === "REWORK" ||
        status === "REWORK_REVIEW" ||
        complaintStatus === "IN_REWORK" ||
        complaintStatus === "REWORK_DONE" ||
        Boolean(resolvedByReportId);

    if (isRework) {
        return `<span class="complaint-dot complaint-dot-yellow" title="Скарга в переробці"></span>`;
    }

    return `<span class="complaint-dot complaint-dot-red" title="Подана скарга"></span>`;
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
    const key = normalizeDetailRequestStatus(status);
    return BOSS_DETAIL_REQUEST_STATUS_LABELS[key] || status || "—";
}

function normalizeDetailRequestStatus(status) {
    const key = String(status || "").trim().toUpperCase();
    return key === "REJECTED" ? "CANCELED" : key;
}

function getDetailRequestStatusClass(status) {
    const key = normalizeDetailRequestStatus(status);

    if (key === "CREATED") return "CREATED";
    if (key === "RESERVED") return "RESERVED";
    if (key === "APPROVED") return "APPROVED";
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
            const reportText = escapeHtml(
                report.reportText ||
                report.ReportText ||
                report.text ||
                "—"
            );

            const createdAt = formatDate(report.createdAt || report.CreatedAt);

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

/* ===================== DETAILS ===================== */

function createDetailsField(label, value, options = {}) {
    const fullClass = options.full ? " full" : "";
    const valueClass = options.valueClass ? ` ${options.valueClass}` : "";
    const safeValue =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : value;

    return `
        <div class="order-detail-field${fullClass}">
            <div class="order-detail-label">${escapeHtml(label)}</div>
            <div class="order-detail-value${valueClass}">${safeValue}</div>
        </div>
    `;
}

function buildComplaintActionsHtml(order) {
    const orderStatus = getOrderStatus(order);
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

                <div class="complaint-actions-buttons">
                    <button type="button" class="btn-main js-complaint-resolve">
                        Закрити скаргу
                    </button>
                </div>

                <div class="complaint-actions-note">
                    Після завершення переробки начальник може закрити скаргу.
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
                        Прийняти переробку
                    </button>
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

function buildDetailsHtml(order) {
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatusLabel = getComplaintStatusLabel(order);
    const reportsHtml = buildReportsHtml(order.reports);
    const detailRequestsHtml = buildDetailRequestsHtml(order);

    return `
        <div class="order-details-grid">
            ${createDetailsField("ID заявки", escapeHtml(getOrderId(order) || "—"), { valueClass: "mono" })}
            ${createDetailsField("Дата створення", formatDate(order.createdAt || order.CreatedAt))}

            ${createDetailsField("Статус", escapeHtml(localizeStatus(getOrderStatus(order))))}
            ${createDetailsField("Тип заявки", escapeHtml(formatServiceType(order.serviceType || order.ServiceType || order.service_type)))}

            ${createDetailsField("ПІБ працівника", escapeHtml(getWorkerName(order)))}
            ${createDetailsField("Телефон працівника", escapeHtml(order.workerPhone || order.worker_phone || order.worker?.phone || "—"))}
            ${createDetailsField("Посада працівника", escapeHtml(order.workerPosition || order.worker_position || order.worker?.position || "—"))}

            ${createDetailsField("ПІБ спеціаліста", escapeHtml(getSpecialistName(order)))}
            ${createDetailsField("Телефон спеціаліста", escapeHtml(order.specialistPhone || order.specialist_phone || order.specialist?.phone || "—"))}
            ${createDetailsField("Посада спеціаліста", escapeHtml(order.specialistPosition || order.specialist_position || order.specialist?.position || "—"))}

            ${createDetailsField("Цех", escapeHtml(order.productionWorkshopNumber ?? order.workshopNumber ?? order.production_workshop_number ?? "—"))}
            ${createDetailsField("Поверх", escapeHtml(order.floorNumber ?? order.floor_number ?? "—"))}
            ${createDetailsField("Кімната", escapeHtml(order.roomNumber ?? order.officeNumber ?? order.room_number ?? order.office_number ?? "—"))}

            ${createDetailsField("Результат огляду", escapeHtml(order.inspectionResult || order.InspectionResult || order.inspection_result || "—"), { full: true, valueClass: "long-text" })}
            ${createDetailsField("Опис проблеми", escapeHtml(order.descriptionProblem || order.DescriptionProblem || order.description_problem || "—"), { full: true, valueClass: "long-text" })}

            ${createDetailsField("Історія запитів деталей", detailRequestsHtml, { full: true })}
            ${createDetailsField("Усі звіти", reportsHtml, { full: true, valueClass: "long-text" })}

            ${createDetailsField("Скарга подана", complaintSubmitted ? "Так" : "Ні")}
            ${createDetailsField("Статус скарги", escapeHtml(complaintStatusLabel || "—"))}
            ${createDetailsField("Текст скарги", escapeHtml(getComplaintText(order)), { full: true, valueClass: "long-text" })}
        </div>

        ${buildComplaintActionsHtml(order)}
    `;
}

/* ===================== FULL ORDER DETAILS ===================== */

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
        typeof fetchOrderReports === "function" ? fetchOrderReports(orderId) : Promise.resolve([])
    ]);

    const fullOrder = {
        ...details,
        id: details?.id || details?._id || orderId,
        reports: reports || [],
        __reportsLoaded: true
    };

    const specialistId = getSpecialistIdFromOrderOnly(fullOrder);

    if (specialistId) {
        bossAssignedSpecialistUiState[orderId] = specialistId;
    }

    orderDetailsCache[orderId] = fullOrder;
    return fullOrder;
}

async function fetchFullOrderDetailsFresh(orderId) {
    if (!orderId) {
        throw new Error("Order id not found");
    }

    const [details, reports] = await Promise.all([
        fetchOrderDetails(orderId),
        typeof fetchOrderReports === "function" ? fetchOrderReports(orderId) : Promise.resolve([])
    ]);

    const fullOrder = {
        ...details,
        id: details?.id || details?._id || orderId,
        reports: reports || [],
        __reportsLoaded: true
    };

    const specialistId = getSpecialistIdFromOrderOnly(fullOrder);

    if (specialistId) {
        bossAssignedSpecialistUiState[orderId] = specialistId;
    }

    orderDetailsCache[orderId] = fullOrder;
    return fullOrder;
}

/* ===================== PARTIAL RENDER UPDATE ===================== */

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

    if (statusFilter && getOrderStatus(order) !== String(statusFilter).trim().toUpperCase()) {
        return false;
    }

    return matchesOrderPeopleFilter(order);
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

async function updateRenderedOrderOnly(orderId, options = {}) {
    if (!orderId) {
        return;
    }

    const tbodyId = options.tbodyId || getCurrentBossTbodyId();
    const pair = findRenderedOrderPair(tbodyId, orderId);

    const freshOrder = await fetchFullOrderDetailsFresh(orderId);

    if (bossAssignedSpecialistUiState[orderId]) {
        freshOrder.specialistId = bossAssignedSpecialistUiState[orderId];
        freshOrder.specialist_id = bossAssignedSpecialistUiState[orderId];
    }

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
        const tbody = document.getElementById(tbodyId);

        if (tbody) {
            const emptyRow = tbody.querySelector("tr:not(.main-row):not(.details-row)");

            if (emptyRow) {
                emptyRow.remove();
            }

            const newPair = createRenderedOrderRows(freshOrder, tbodyId);
            tbody.prepend(newPair.detailsRow);
            tbody.prepend(newPair.mainRow);
        }

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

async function refreshOrdersAfterAction(orderId, options = {}) {
    if (!orderId) {
        return;
    }

    await updateRenderedOrderOnly(orderId, options);

    if (typeof updateComplaintsBadge === "function") {
        await updateComplaintsBadge();
    }
}

/* ===================== ASSIGN CONTROLS ===================== */

function isOrderClosedForAssign(order) {
    const status = getOrderStatus(order);

    return (
        status === "DONE" ||
        status === "CANCELED" ||
        status === "UNDER_COMPLAINT" ||
        status === "REWORK" ||
        status === "REWORK_REVIEW"
    );
}

function createAssignControls(order) {
    const wrap = document.createElement("div");
    wrap.className = "assign-wrap";
    wrap.addEventListener("click", stopRowToggle);

    const orderId = getOrderId(order);
    const orderStatus = getOrderStatus(order);

    if (!orderId) {
        const label = document.createElement("div");
        label.className = "btn-disabled";
        label.textContent = "Немає ID";
        wrap.appendChild(label);
        return wrap;
    }

    if (isOrderClosedForAssign(order)) {
        const label = document.createElement("div");
        label.className = "btn-disabled";

        if (orderStatus === "DONE") {
            label.textContent = "Закрито";
        } else if (orderStatus === "CANCELED") {
            label.textContent = "Заблоковано";
        } else {
            label.textContent = "Недоступно";
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
        const specialistId = normalizeBossId(specialist.id || specialist._id);

        const option = document.createElement("option");
        option.value = specialistId;
        option.textContent =
            specialist.fullName ||
            specialist.login ||
            specialistId;

        select.appendChild(option);
    }

    select.value = currentSpecialistId || "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-main";
    btn.textContent = currentSpecialistId ? "Оновити" : "Призначити";

    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const selectedSpecialistId = normalizeBossId(select.value);

        if (!selectedSpecialistId) {
            setStatus("Оберіть спеціаліста", true);
            return;
        }

        if (selectedSpecialistId === currentSpecialistId) {
            setStatus("Цей спеціаліст вже призначений");
            return;
        }

        const restore = setPendingButton(btn, "Збереження...");
        select.disabled = true;

        try {
            const result = await assignSpecialist(orderId, selectedSpecialistId);

            bossAssignedSpecialistUiState[orderId] = selectedSpecialistId;

            const selectedSpecialist = bossSpecialists.find(x =>
                normalizeBossId(x.id || x._id) === selectedSpecialistId
            );

            if (selectedSpecialist) {
                bossSpecialistsMap[selectedSpecialistId] =
                    selectedSpecialist.fullName ||
                    selectedSpecialist.login ||
                    selectedSpecialistId;
            }

            order.specialistId = selectedSpecialistId;
            order.SpecialistId = selectedSpecialistId;
            order.specialist_id = selectedSpecialistId;

            if (selectedSpecialist) {
                order.specialistFullName =
                    selectedSpecialist.fullName ||
                    selectedSpecialist.login ||
                    selectedSpecialistId;
            }

            orderDetailsCache[orderId] = {
                ...(orderDetailsCache[orderId] || {}),
                ...order,
                specialistId: selectedSpecialistId,
                specialist_id: selectedSpecialistId
            };

            setStatus(result?.message || "Спеціаліста оновлено");

            await refreshOrdersAfterAction(orderId);
        } catch (err) {
            setStatus(err.message || "Не вдалося оновити спеціаліста", true);
            select.disabled = false;
            restore?.();
        }
    };

    wrap.append(select, btn);
    return wrap;
}

/* ===================== TABLE RENDER ===================== */

function sortOrders(orders) {
    const statusOrder = {
        NEW: 1,
        ASSIGNED: 2,
        IN_PROGRESS: 3,
        INSPECTION: 4,
        WAITING_DETAILS: 5,
        DETAILS_RECEIVED: 6,
        EXECUTION: 7,
        UNDER_COMPLAINT: 8,
        REWORK: 9,
        REWORK_REVIEW: 10,
        DONE: 11,
        CANCELED: 12
    };

    return [...orders].sort((a, b) => {
        const sa = statusOrder[getOrderStatus(a)] ?? 999;
        const sb = statusOrder[getOrderStatus(b)] ?? 999;

        if (sa !== sb) {
            return sa - sb;
        }

        return new Date(b.createdAt || b.CreatedAt || 0) -
            new Date(a.createdAt || a.CreatedAt || 0);
    });
}

async function fillDetailsRow(order, detailsRow) {
    const orderId = getOrderId(order);

    if (!orderId) {
        detailsRow.innerHTML = `
            <td colspan="8">
                <div class="error-box">ID заявки не знайдено</div>
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
                <div class="error-box">${escapeHtml(err.message || "Помилка завантаження деталей")}</div>
            </td>
        `;
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

    const description =
        order.descriptionProblem ||
        order.DescriptionProblem ||
        order.description_problem ||
        "";

    const serviceType =
        order.serviceType ||
        order.ServiceType ||
        order.service_type ||
        "";

    const complaintMark = getComplaintMarkHtml(order);

    const currentSpecialistId = getSpecialistIdFromOrderOnly(order);

    if (orderId && currentSpecialistId) {
        bossAssignedSpecialistUiState[orderId] = currentSpecialistId;
    }

    mainRow.innerHTML = `
        <td class="cell-mono">
            ${escapeHtml(orderId || "—")}
            ${complaintMark}
            <span class="expand-mark">⌄</span>
        </td>

        <td>${escapeHtml(getWorkerName(order))}</td>
        <td>${escapeHtml(getSpecialistName(order))}</td>
        <td>${getStatusBadge(order)}</td>
        <td>${escapeHtml(formatServiceType(serviceType))}</td>

        <td class="cell-truncate" title="${escapeHtml(description)}">
            ${escapeHtml(shortText(description, 70))}
        </td>

        <td>${escapeHtml(formatLocation(order))}</td>
        <td class="cell-actions"></td>
    `;

    const assignCell = mainRow.lastElementChild;

    if (tbodyId === "orders") {
        assignCell.appendChild(createAssignControls(order));
    } else {
        assignCell.innerHTML = `<span class="muted">Перегляд</span>`;
    }

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

function renderOrdersTable(orders, tbodyId = "orders", emptyMessage = "Немає заявок") {
    const tbody = document.getElementById(tbodyId);

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!orders.length) {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td colspan="8">
                <div class="empty-box">${escapeHtml(emptyMessage)}</div>
            </td>
        `;

        tbody.appendChild(tr);
        return;
    }

    for (const order of orders) {
        const orderId = getOrderId(order);
        const specialistId = getSpecialistIdFromOrderOnly(order);

        if (orderId && specialistId) {
            bossAssignedSpecialistUiState[orderId] = specialistId;
        }

        const pair = createRenderedOrderRows(order, tbodyId);
        tbody.append(pair.mainRow, pair.detailsRow);
    }
}

/* ===================== LOAD ORDERS ===================== */

async function loadOrders() {
    if (typeof activeTab !== "undefined" && activeTab !== "orders") {
        return;
    }

    const tbody = document.getElementById("orders");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-box">Завантаження...</div>
            </td>
        </tr>
    `;

    try {
        await ensurePeopleLoaded();

        const statusFilter = document.getElementById("statusFilter");
        const status = statusFilter ? statusFilter.value : "";

        updateOrderPeopleFilterOptions();

        const orders = await fetchOrders(status);
        const sorted = sortOrders(filterOrdersByBossFilters(orders));

        renderOrdersTable(sorted, "orders", "Немає заявок");

        setStatus(`Завантажено ${sorted.length} заявок`);

        if (typeof updateComplaintsBadge === "function") {
            await updateComplaintsBadge();
        }
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="error-box">${escapeHtml(err.message || "Помилка завантаження заявок")}</div>
                </td>
            </tr>
        `;

        setStatus(err.message || "Помилка завантаження заявок", true);
    }
}

/* ===================== COMPLAINT ACTIONS ===================== */

function attachComplaintActionHandlers(order, detailsRow) {
    const orderId = getOrderId(order);

    if (!orderId) {
        return;
    }

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

                await refreshOrdersAfterAction(orderId, {
                    activeComplaintDelta: 0
                });
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
                const result = await rejectComplaint(
                    orderId,
                    "Скаргу відхилено начальником"
                );

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

/* ===================== COMPLAINTS TAB ===================== */

function isComplaintOrder(order) {
    return getComplaintSubmitted(order);
}

function isActiveComplaintOrder(order) {
    const status = getOrderStatus(order);
    const complaintStatus = getComplaintStatus(order);

    if (!getComplaintSubmitted(order)) {
        return false;
    }

    return (
        complaintStatus === "SUBMITTED" ||
        complaintStatus === "IN_REWORK" ||
        complaintStatus === "REWORK_DONE" ||
        status === "UNDER_COMPLAINT" ||
        status === "REWORK" ||
        status === "REWORK_REVIEW"
    );
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
            } catch {
                return order;
            }
        })
    );

    return detailedOrders;
}

async function loadComplaintsOrders() {
    if (typeof activeTab !== "undefined" && activeTab !== "complaints") {
        return;
    }

    const tbody = document.getElementById("complaintsOrders");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="empty-box">Завантаження скарг...</div>
            </td>
        </tr>
    `;

    try {
        await ensurePeopleLoaded();

        const detailedOrders = await getOrdersWithDetailsForComplaints();

        let complaintOrders = detailedOrders.filter(isComplaintOrder);

        const filter = document.getElementById("complaintStatusFilter");

        if (filter && filter.value === "active") {
            complaintOrders = complaintOrders.filter(isActiveComplaintOrder);
        }

        const sorted = sortOrders(complaintOrders);

        renderOrdersTable(sorted, "complaintsOrders", "Немає заявок зі скаргами");

        setStatus(`Завантажено ${sorted.length} скарг`);
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="error-box">${escapeHtml(err.message || "Помилка завантаження скарг")}</div>
                </td>
            </tr>
        `;

        setStatus(err.message || "Помилка завантаження скарг", true);
    }
}

async function updateComplaintsBadge() {
    const badge = document.getElementById("complaintsBadge");
    const tabComplaintsBtn = document.getElementById("tabComplaintsBtn");

    if (!badge) {
        return;
    }

    try {
        const detailedOrders = await getOrdersWithDetailsForComplaints();
        const activeCount = detailedOrders.filter(isActiveComplaintOrder).length;

        badge.textContent = String(activeCount);

        if (activeCount > 0) {
            badge.classList.remove("hidden");
            tabComplaintsBtn?.classList.add("has-complaints");
            badge.title = `Активних скарг: ${activeCount}`;
        } else {
            badge.classList.add("hidden");
            tabComplaintsBtn?.classList.remove("has-complaints");
            badge.title = "";
        }
    } catch {
        badge.textContent = "0";
        badge.classList.add("hidden");
        tabComplaintsBtn?.classList.remove("has-complaints");
    }
}

/* ===================== GLOBAL EXPORTS ===================== */

window.loadOrders = loadOrders;
window.loadComplaintsOrders = loadComplaintsOrders;
window.updateComplaintsBadge = updateComplaintsBadge;
window.updateRenderedOrderOnly = updateRenderedOrderOnly;
