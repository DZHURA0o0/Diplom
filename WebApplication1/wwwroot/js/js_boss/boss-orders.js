let ordersExpandedState = {};
let orderDetailsCache = {};

let bossWorkersMap = {};
let bossSpecialists = [];
let bossSpecialistsMap = {};
let bossPeopleLoaded = false;

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

    // новая логика: если скарга подана, но статус не пришёл явно
    if (!status && getComplaintSubmitted(order)) {
        if (orderStatus === "REWORK") return "IN_REWORK";
        if (complaint?.resolvedByReportId || complaint?.resolved_by_report_id) return "RESOLVED";
        return "SUBMITTED";
    }

    // совместимость со старым OPEN
    if (status === "OPEN") return "SUBMITTED";

    return status || null;
}

function getComplaintStatusLabel(order) {
    const status = getComplaintStatus(order);

    if (status === "SUBMITTED") return "ПОДАНА";
    if (status === "IN_REWORK") return "НА ПЕРЕРОБЦІ";
    if (status === "RESOLVED") return "ВИРІШЕНА";
    if (status === "REJECTED") return "ВІДХИЛЕНА";

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

function getStatusBadge(order) {
    const status = order.status || "UNKNOWN";
    return `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function shortText(value, max = 60) {
    if (!value) return "—";
    const text = String(value);
    if (text.length <= max) return text;
    return text.slice(0, max).trim() + "…";
}

function serviceTypeLabel(value) {
    const map = {
        ELECTRICAL: "ELECTRICAL",
        PC_PROBLEM: "PC_PROBLEM",
        PRINTER_PROBLEM: "PRINTER_PROBLEM",
        SOFTWARE_BUG: "SOFTWARE_BUG",
        INTERNET: "INTERNET",
        SEAL_DAMAGE: "SEAL_DAMAGE",
        AUDIO_VIDEO: "AUDIO_VIDEO",
        OTHER: "OTHER",
        HEATING: "HEATING",
        PLUMBING: "PLUMBING"
    };

    return map[value] || value || "—";
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
            login: specialist.login || ""
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
        <div class="details-field${fullClass}">
            <div class="details-label">${escapeHtml(label)}</div>
            <div class="details-value${valueClass}">${safeValue}</div>
        </div>
    `;
}

function buildComplaintActionsHtml(order) {
    const orderStatus = String(order.status || "").trim().toUpperCase();
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatus = getComplaintStatus(order);

    if (!complaintSubmitted) {
        return "";
    }

    // Кнопки должны быть, когда скарга подана и заявка завершена
    if (complaintStatus === "SUBMITTED" && orderStatus === "DONE") {
        return `
            <div class="details-complaint-actions">
                <div class="details-actions-title">Дії по скарзі</div>
                <div class="details-actions-row">
                    <button type="button" class="btn-warning js-complaint-rework">На переробку</button>
                    <button type="button" class="btn-danger js-complaint-reject">Відхилити скаргу</button>
                </div>
            </div>
        `;
    }

    if (complaintStatus === "IN_REWORK" || orderStatus === "REWORK") {
        return `
            <div class="details-complaint-actions">
                <div class="details-actions-title">Дії по скарзі</div>
                <div class="details-actions-row">
                    <span class="status-badge status-REWORK">Заявка на переробці</span>
                </div>
            </div>
        `;
    }

    if (complaintStatus === "RESOLVED") {
        return `
            <div class="details-complaint-actions">
                <div class="details-actions-title">Дії по скарзі</div>
                <div class="details-actions-row">
                    <span class="status-badge status-DONE">Скаргу закрито</span>
                </div>
            </div>
        `;
    }

    if (complaintStatus === "REJECTED") {
        return `
            <div class="details-complaint-actions">
                <div class="details-actions-title">Дії по скарзі</div>
                <div class="details-actions-row">
                    <span class="status-badge status-CANCELED">Скаргу відхилено</span>
                </div>
            </div>
        `;
    }

    return "";
}

function buildDetailsHtml(order) {
    const complaintSubmitted = getComplaintSubmitted(order);
    const complaintStatusLabel = getComplaintStatusLabel(order);

    return `
        <div class="details-panel">
            <div class="details-grid">

                ${createDetailsField("ID заявки", escapeHtml(order.id || "—"), { valueClass: "mono" })}
                ${createDetailsField("Дата створення", formatDate(order.createdAt))}

                ${createDetailsField("Статус", escapeHtml(order.status || "—"))}
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
                ${createDetailsField("Звіт спеціаліста", escapeHtml(order.workReportText || "—"), { full: true, valueClass: "long-text" })}

                ${createDetailsField("Скарга подана", complaintSubmitted ? "Так" : "Ні")}
                ${createDetailsField("Статус скарги", escapeHtml(complaintStatusLabel || "—"))}

                ${createDetailsField("ID скарги", escapeHtml(order.complaintId || "—"), { valueClass: "mono" })}
                ${createDetailsField("Текст скарги", escapeHtml(order.complaintText || "—"), { full: true, valueClass: "long-text" })}
            </div>

            ${buildComplaintActionsHtml(order)}
        </div>
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
    await loadOrders();
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

            const restore = setPendingButton(resolveBtn, "Закриття...");

            try {
                const result = await resolveComplaint(orderId, "Скаргу закрито після переробки");
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

    const orderStatus = (order.status || "").toUpperCase();
    const orderId = getOrderId(order);

    if (orderStatus !== "DONE" && orderStatus !== "CANCELED") {
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
                await assignSpecialist(orderId, select.value);
                setStatus("Спеціаліста оновлено");
                await refreshOrdersAfterAction();
            } catch (err) {
                setStatus(err.message || "Не вдалося оновити спеціаліста", true);
                restore?.();
            }
        };

        wrap.append(select, btn);
    } else {
        const label = document.createElement("div");
        label.className = "btn-disabled";
        label.textContent = orderStatus === "DONE" ? "Закрито" : "Заблоковано";
        wrap.appendChild(label);
    }

    return wrap;
}

function sortOrders(orders) {
    const statusOrder = {
        NEW: 1,
        ASSIGNED: 2,
        IN_PROGRESS: 3,
        INSPECTION: 4,
        WAITING_DETAILS: 5,
        EXECUTION: 6,
        REWORK: 7,
        DONE: 8,
        CANCELED: 9
    };

    return [...orders].sort((a, b) => {
        const sa = statusOrder[a.status] ?? 999;
        const sb = statusOrder[b.status] ?? 999;

        if (sa !== sb) return sa - sb;

        return new Date(b.createdAt) - new Date(a.createdAt);
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
            fullOrder = await fetchOrderDetails(orderId);
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

function renderOrdersTable(orders) {
    const tbody = document.getElementById("orders");
    tbody.innerHTML = "";

    if (!orders.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8"><div class="empty-box">Немає заявок</div></td>`;
        tbody.appendChild(tr);
        return;
    }

    for (const order of orders) {
        const orderId = getOrderId(order);

        const mainRow = document.createElement("tr");
        mainRow.className = "main-row";

        if (ordersExpandedState[orderId]) {
            mainRow.classList.add("is-open");
        }

        const detailsRow = document.createElement("tr");
        detailsRow.className = "details-row";

        if (!ordersExpandedState[orderId]) {
            detailsRow.classList.add("hidden");
        }

        mainRow.innerHTML = `
            <td class="cell-mono">
                ${escapeHtml(orderId || "—")}
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

        if (ordersExpandedState[orderId]) {
            fillDetailsRow(order, detailsRow);
        }

        mainRow.addEventListener("click", async () => {
            const willOpen = detailsRow.classList.contains("hidden");

            if (willOpen) {
                detailsRow.classList.remove("hidden");
                mainRow.classList.add("is-open");
                ordersExpandedState[orderId] = true;
                await fillDetailsRow(order, detailsRow);
            } else {
                detailsRow.classList.add("hidden");
                mainRow.classList.remove("is-open");
                delete ordersExpandedState[orderId];
            }
        });

        tbody.append(mainRow, detailsRow);
    }
}

async function loadOrders() {
    if (activeTab !== "orders") return;

    const tbody = document.getElementById("orders");
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-box">Завантаження...</div></td></tr>`;

    try {
        await ensurePeopleLoaded();

        const status = document.getElementById("statusFilter").value;
        const orders = await fetchOrders(status);
        const sorted = sortOrders(orders);

        renderOrdersTable(sorted);
        setStatus(`Завантажено ${sorted.length} заявок`);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="error-box">${escapeHtml(err.message || "Load orders error")}</div></td></tr>`;
        setStatus(err.message || "Load orders error", true);
    }
}