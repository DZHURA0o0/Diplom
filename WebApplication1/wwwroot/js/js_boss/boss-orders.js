let ordersExpandedState = {};
let orderDetailsCache = {};

let bossWorkersMap = {};
let bossSpecialists = [];
let bossSpecialistsMap = {};
let bossPeopleLoaded = false;

const STATUS_LABELS = {
    NEW: "Нова",
    ASSIGNED: "Призначена",
    IN_PROGRESS: "У роботі",
    INSPECTION: "На огляді",
    WAITING_DETAILS: "Очікує деталей",
    EXECUTION: "На виконанні",
    REWORK: "На переробці",
    DONE: "Виконана",
    CANCELED: "Скасована"
};

const SERVICE_TYPE_LABELS = {
    ELECTRICAL: "Електроживлення / електрика",
    PC_PROBLEM: "Проблема з ПК",
    PRINTER_PROBLEM: "Проблема з принтером",
    SOFTWARE_BUG: "Проблема з ПЗ",
    INTERNET: "Інтернет / мережа",
    SEAL_DAMAGE: "Пошкодження пломби",
    AUDIO_VIDEO: "Аудіо / відео",
    OTHER: "Інше",
    HEATING: "Опалення",
    PLUMBING: "Сантехніка"
};

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return escapeHtml(value);

    return date.toLocaleString();
}

function formatLocation(order) {
    return `Цех ${order.productionWorkshopNumber ?? "—"}, Поверх ${order.floorNumber ?? "—"}, Кімната ${order.roomNumber ?? "—"}`;
}

function getOrderId(order) {
    return order.id || order._id || null;
}

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

    if (!status && getComplaintSubmitted(order)) {
        if (orderStatus === "REWORK") return "IN_REWORK";
        if (complaint?.resolvedByReportId || complaint?.resolved_by_report_id) return "RESOLVED";
        return "SUBMITTED";
    }

    if (status === "OPEN") return "SUBMITTED";

    return status || null;
}

function getComplaintStatusLabel(order) {
    const status = getComplaintStatus(order);

    if (status === "SUBMITTED") return "Подана";
    if (status === "IN_REWORK") return "На переробці";
    if (status === "RESOLVED") return "Вирішена";
    if (status === "REJECTED") return "Відхилена";

    return status || "—";
}

function getWorkerName(order) {
    const workerId = getWorkerId(order);
    if (!workerId) return "—";

    return bossWorkersMap[workerId] || workerId;
}

function getSpecialistName(order) {
    const specialistId = getSpecialistId(order);
    if (!specialistId) return "—";

    return bossSpecialistsMap[specialistId] || specialistId;
}

function localizeStatus(status) {
    const key = String(status || "").trim().toUpperCase();
    return STATUS_LABELS[key] || status || "—";
}

function getStatusBadge(order) {
    const status = String(order.status || "UNKNOWN").trim().toUpperCase();

    return `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(localizeStatus(status))}</span>`;
}

function shortText(value, max = 60) {
    if (!value) return "—";

    const text = String(value);
    if (text.length <= max) return text;

    return text.slice(0, max).trim() + "…";
}

function serviceTypeLabel(value) {
    const key = String(value || "").trim().toUpperCase();

    return SERVICE_TYPE_LABELS[key] || value || "—";
}

async function ensurePeopleLoaded() {
    if (bossPeopleLoaded) return;

    const [workers, specialists] = await Promise.all([
        fetchWorkers(),
        fetchSpecialists()
    ]);

    bossWorkersMap = {};

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

    bossSpecialistsMap = {};

    for (const specialist of bossSpecialists) {
        bossSpecialistsMap[specialist.id] = specialist.fullName || specialist.login || specialist.id;
    }

    bossPeopleLoaded = true;
}

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

function buildReportsHtml(reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
        return "—";
    }

    return reports
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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

function buildComplaintActionsHtml(order) {
    const orderStatus = String(order.status || "").trim().toUpperCase();
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatus = getComplaintStatus(order);

    if (!complaintSubmitted) {
        return "";
    }

    if (complaintStatus === "SUBMITTED" && orderStatus === "DONE") {
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
        const canCloseComplaint = orderStatus === "DONE";

        return `
            <div class="complaint-actions-block">
                <div class="complaint-actions-title">Дії по скарзі</div>

                <div class="complaint-actions-buttons">
                    <button
                        type="button"
                        class="btn-main js-complaint-resolve"
                        ${canCloseComplaint ? "" : "disabled"}
                    >
                        Закрити скаргу
                    </button>
                </div>

                <div class="complaint-actions-note">
                    ${
                        canCloseComplaint
                            ? "Переробку завершено. Начальник може закрити скаргу."
                            : "Скарга знаходиться на переробці. Закрити її можна тільки після завершення роботи спеціалістом."
                    }
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

    return `
        <div class="order-details-grid">
            ${createDetailsField("ID заявки", escapeHtml(order.id || "—"), { valueClass: "mono" })}
            ${createDetailsField("Дата створення", formatDate(order.createdAt))}
            ${createDetailsField("Статус", escapeHtml(localizeStatus(order.status || "—")))}
            ${createDetailsField("Тип заявки", escapeHtml(serviceTypeLabel(order.serviceType)))}

            ${createDetailsField("ПІБ працівника", escapeHtml(order.workerFullName || "—"))}
            ${createDetailsField("Телефон працівника", escapeHtml(order.workerPhone || "—"))}
            ${createDetailsField("Посада працівника", escapeHtml(order.workerPosition || "—"))}

            ${createDetailsField("ПІБ спеціаліста", escapeHtml(order.specialistFullName || "—"))}
            ${createDetailsField("Телефон спеціаліста", escapeHtml(order.specialistPhone || "—"))}
            ${createDetailsField("Посада спеціаліста", escapeHtml(order.specialistPosition || "—"))}

            ${createDetailsField("Цех", escapeHtml(order.productionWorkshopNumber ?? "—"))}
            ${createDetailsField("Поверх", escapeHtml(order.floorNumber ?? "—"))}
            ${createDetailsField("Кімната", escapeHtml(order.roomNumber ?? "—"))}

            ${createDetailsField("Результат огляду", escapeHtml(order.inspectionResult || "—"), { full: true, valueClass: "long-text" })}
            ${createDetailsField("Опис проблеми", escapeHtml(order.descriptionProblem || "—"), { full: true, valueClass: "long-text" })}
            ${createDetailsField("Потреба в деталях", escapeHtml(order.detailNeeds || "—"), { full: true, valueClass: "long-text" })}
            ${createDetailsField("Пояснення до деталей", escapeHtml(order.detailExplanation || "—"), { full: true, valueClass: "long-text" })}

            ${createDetailsField("Усі звіти", reportsHtml, { full: true, valueClass: "long-text" })}

            ${createDetailsField("Скарга подана", complaintSubmitted ? "Так" : "Ні")}
            ${createDetailsField("Статус скарги", escapeHtml(complaintStatusLabel || "—"))}
            ${createDetailsField("Текст скарги", escapeHtml(order.complaintText || "—"), { full: true, valueClass: "long-text" })}
        </div>

        ${buildComplaintActionsHtml(order)}
    `;
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

async function refreshOrdersAfterAction() {
    orderDetailsCache = {};

    if (typeof updateComplaintsBadge === "function") {
        await updateComplaintsBadge();
    }

    if (typeof activeTab !== "undefined" && activeTab === "complaints") {
        await loadComplaintsOrders();
    } else {
        await loadOrders();
    }
}

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
                await refreshOrdersAfterAction();
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

            if (resolveBtn.disabled) {
                return;
            }

            const restore = setPendingButton(resolveBtn, "Закриття...");

            try {
                const result = await resolveComplaint(orderId, "Скаргу закрито начальником після переробки");
                setStatus(result?.message || "Скаргу закрито");
                await refreshOrdersAfterAction();
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
                await refreshOrdersAfterAction();
            } catch (err) {
                setStatus(err.message || "Не вдалося відхилити скаргу", true);
                restore?.();
            }
        });
    }
}

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

    if (orderStatus === "DONE" || orderStatus === "CANCELED") {
        const label = document.createElement("div");
        label.className = "btn-disabled";
        label.textContent = orderStatus === "DONE" ? "Закрито" : "Заблоковано";
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
            await refreshOrdersAfterAction();
        } catch (err) {
            setStatus(err.message || "Не вдалося оновити спеціаліста", true);
            restore?.();
        }
    };

    wrap.append(select, btn);

    return wrap;
}

function sortOrders(orders) {
    return [...orders].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);

        return dateB - dateA;
    });
}

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
        let fullOrder = orderDetailsCache[orderId];

        if (!fullOrder) {
            const [details, reports] = await Promise.all([
                fetchOrderDetails(orderId),
                fetchOrderReports(orderId)
            ]);

            fullOrder = {
                ...details,
                reports: reports || []
            };

            orderDetailsCache[orderId] = fullOrder;
        }

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

    if (complaintStatus === "SUBMITTED") {
        return `<span class="complaint-row-mark complaint-row-mark-red" title="Нова скарга">!</span>`;
    }

    if (complaintStatus === "IN_REWORK" || orderStatus === "REWORK") {
        return `<span class="complaint-row-mark complaint-row-mark-yellow" title="Скарга на переробці">!</span>`;
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
        tr.innerHTML = `<td colspan="8"><div class="empty-box">${message}</div></td>`;
        tbody.appendChild(tr);
        return;
    }

    for (const order of orders) {
        const orderId = getOrderId(order);
        const rowStateKey = `${tbodyId}_${orderId}`;

        const mainRow = document.createElement("tr");
        mainRow.className = "main-row";

        if (ordersExpandedState[rowStateKey]) {
            mainRow.classList.add("is-open");
        }

        const detailsRow = document.createElement("tr");
        detailsRow.className = "details-row";

        if (!ordersExpandedState[rowStateKey]) {
            detailsRow.classList.add("hidden");
        }

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
            <td>${escapeHtml(serviceTypeLabel(order.serviceType || order.service_type))}</td>
            <td class="cell-truncate" title="${escapeHtml(order.descriptionProblem || order.description_problem || "")}">
                ${escapeHtml(shortText(order.descriptionProblem || order.description_problem || "", 70))}
            </td>
            <td>${escapeHtml(formatLocation(order))}</td>
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

        tbody.append(mainRow, detailsRow);
    }
}

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
        const sorted = sortOrders(orders);

        renderOrdersTable(sorted, "orders");
        setStatus(`Завантажено ${sorted.length} заявок`);

        if (typeof updateComplaintsBadge === "function") {
            await updateComplaintsBadge();
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="error-box">${escapeHtml(err.message || "Load orders error")}</div></td></tr>`;
        setStatus(err.message || "Load orders error", true);
    }
}

function isComplaintOrder(order) {
    return getComplaintSubmitted(order);
}

function isActiveComplaintOrder(order) {
    const complaintStatus = getComplaintStatus(order);
    const orderStatus = String(order.status || "").trim().toUpperCase();

    if (!getComplaintSubmitted(order)) return false;

    return complaintStatus === "SUBMITTED"
        || complaintStatus === "IN_REWORK"
        || orderStatus === "REWORK";
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
        const complaintOrders = sortOrders(detailedOrders.filter(isComplaintOrder));

        renderOrdersTable(complaintOrders, "complaintsOrders");
        setStatus(`Завантажено ${complaintOrders.length} заявок зі скаргами`);

        await updateComplaintsBadge(detailedOrders);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="error-box">${escapeHtml(err.message || "Complaints load error")}</div></td></tr>`;
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