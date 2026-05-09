let analyticsSpecialistsLoaded = false;

function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0%";
    }

    return `${number.toFixed(1)}%`;
}

function formatAnalyticsNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return String(number);
}

function getTodayInputValue() {
    const date = new Date();
    return date.toISOString().slice(0, 10);
}

function getMonthStartInputValue() {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
}

function initBossAnalyticsFilters() {
    const fromInput = document.getElementById("analyticsFrom");
    const toInput = document.getElementById("analyticsTo");

    if (fromInput && !fromInput.value) {
        fromInput.value = getMonthStartInputValue();
    }

    if (toInput && !toInput.value) {
        toInput.value = getTodayInputValue();
    }
}

async function fillAnalyticsSpecialistsFilter() {
    const select = document.getElementById("analyticsSpecialistFilter");
    if (!select || analyticsSpecialistsLoaded) return;

    try {
        if (typeof ensurePeopleLoaded === "function") {
            await ensurePeopleLoaded();
        } else if (typeof fetchSpecialists === "function") {
            bossSpecialists = await fetchSpecialists();
        }

        select.innerHTML = `<option value="">Усі спеціалісти</option>`;

        const specialists = Array.isArray(bossSpecialists) ? bossSpecialists : [];

        specialists
            .map(specialist => ({
                id: specialist.id || specialist._id || "",
                fullName: specialist.fullName || specialist.full_name || specialist.login || "—",
                accountStatus: specialist.accountStatus || specialist.account_status || ""
            }))
            .filter(specialist => specialist.id)
            .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), "uk"))
            .forEach(specialist => {
                const label = specialist.accountStatus === "INACTIVE"
                    ? `${specialist.fullName} (неактивний)`
                    : specialist.fullName;

                const option = new Option(label, specialist.id);
                select.appendChild(option);
            });

        analyticsSpecialistsLoaded = true;
    }
    catch (e) {
        console.error(e);
        setStatus("Не вдалося завантажити список спеціалістів: " + e.message, true);
    }
}

function resetAnalyticsFilters() {
    const fromInput = document.getElementById("analyticsFrom");
    const toInput = document.getElementById("analyticsTo");
    const specialistSelect = document.getElementById("analyticsSpecialistFilter");

    if (fromInput) fromInput.value = getMonthStartInputValue();
    if (toInput) toInput.value = getTodayInputValue();
    if (specialistSelect) specialistSelect.value = "";

    loadAnalytics();
}

function getAnalyticsFilters() {
    return {
        from: document.getElementById("analyticsFrom")?.value || "",
        to: document.getElementById("analyticsTo")?.value || "",
        specialistId: document.getElementById("analyticsSpecialistFilter")?.value || ""
    };
}

function normalizeAnalytics(data) {
    return {
        totalOrders: data.totalOrders ?? data.total_orders ?? 0,
        completedOrders: data.completedOrders ?? data.completed_orders ?? 0,
        activeOrders: data.activeOrders ?? data.active_orders ?? 0,
        complaintsCount: data.complaintsCount ?? data.complaints_count ?? 0,
        reworkCount: data.reworkCount ?? data.rework_count ?? 0,
        averageEfficiencyPercent: data.averageEfficiencyPercent ?? data.average_efficiency_percent ?? 0,

        specialists: data.specialists ?? data.specialistAnalytics ?? data.specialist_analytics ?? [],

        topComplainers: data.topComplainers ?? data.top_complainers ?? [],
        topRequesters: data.topRequesters ?? data.top_requesters ?? [],
        topLocations: data.topLocations ?? data.top_locations ?? [],

        serviceTypes: data.serviceTypes ?? data.serviceTypeAnalytics ?? data.service_type_analytics ?? [],

        bonusRecommendation: data.bonusRecommendation ?? data.bonus_recommendation ?? null
    };
}

function getAnalyticsSummaryCard(label, value) {
    return `
        <div class="analytics-card">
            <div class="analytics-card-label">${escapeHtml(label)}</div>
            <div class="analytics-card-value">${escapeHtml(value)}</div>
        </div>
    `;
}

function renderAnalyticsSummary(data) {
    const container = document.getElementById("analyticsSummary");
    if (!container) return;

    container.innerHTML = [
        getAnalyticsSummaryCard("Усього заявок", formatAnalyticsNumber(data.totalOrders)),
        getAnalyticsSummaryCard("Виконано", formatAnalyticsNumber(data.completedOrders)),
        getAnalyticsSummaryCard("Активні", formatAnalyticsNumber(data.activeOrders)),
        getAnalyticsSummaryCard("Скарги", formatAnalyticsNumber(data.complaintsCount)),
        getAnalyticsSummaryCard("Переробки", formatAnalyticsNumber(data.reworkCount)),
        getAnalyticsSummaryCard("Найбільша частка", formatPercent(data.averageEfficiencyPercent))
    ].join("");
}

/* ===================== CHARTS ===================== */

function clampPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    if (number < 0) return 0;
    if (number > 100) return 100;

    return number;
}

function renderHorizontalBarChart(containerId, rows, emptyMessage = "Немає даних для графіка") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
        container.innerHTML = `<div class="analytics-chart-empty">${escapeHtml(emptyMessage)}</div>`;
        return;
    }

    rows.forEach(row => {
        const label = row.label || "—";
        const value = Number(row.value ?? 0);
        const percent = clampPercent(row.percent ?? 0);

        const item = document.createElement("div");
        item.className = "analytics-chart-row";

        item.innerHTML = `
            <div class="analytics-chart-label">
                ${escapeHtml(label)}
            </div>

            <div class="analytics-chart-track">
                <div class="analytics-chart-fill" style="width: ${percent}%"></div>
            </div>

            <div class="analytics-chart-value">
                ${escapeHtml(formatAnalyticsNumber(value))} · ${escapeHtml(formatPercent(percent))}
            </div>
        `;

        container.appendChild(item);
    });
}

function renderOrdersStatusChart(analytics) {
    const total = Number(analytics.totalOrders) || 0;

    const rows = [
        {
            label: "Усього заявок",
            value: analytics.totalOrders,
            percent: total > 0 ? 100 : 0
        },
        {
            label: "Виконано",
            value: analytics.completedOrders,
            percent: total > 0 ? analytics.completedOrders / total * 100 : 0
        },
        {
            label: "Активні",
            value: analytics.activeOrders,
            percent: total > 0 ? analytics.activeOrders / total * 100 : 0
        },
        {
            label: "Скарги",
            value: analytics.complaintsCount,
            percent: total > 0 ? analytics.complaintsCount / total * 100 : 0
        },
        {
            label: "Переробки",
            value: analytics.reworkCount,
            percent: total > 0 ? analytics.reworkCount / total * 100 : 0
        }
    ];

    renderHorizontalBarChart("chartOrdersStatus", rows, "Немає заявок за обраний період");
}

function renderSpecialistShareChart(analytics) {
    const rows = (Array.isArray(analytics.specialists) ? analytics.specialists : [])
        .map(normalizeSpecialistAnalytics)
        .filter(item => Number(item.completedCount) > 0)
        .sort((a, b) => Number(b.efficiencyPercent) - Number(a.efficiencyPercent))
        .slice(0, 5)
        .map(item => ({
            label: item.fullName,
            value: item.completedCount,
            percent: item.efficiencyPercent
        }));

    renderHorizontalBarChart("chartSpecialistShare", rows, "Немає виконаних заявок по спеціалістах");
}

function renderServiceTypesChart(analytics) {
    const total = Number(analytics.totalOrders) || 0;

    const rows = (Array.isArray(analytics.serviceTypes) ? analytics.serviceTypes : [])
        .map(normalizeServiceType)
        .filter(item => Number(item.count) > 0)
        .sort((a, b) => Number(b.count) - Number(a.count))
        .slice(0, 5)
        .map(item => {
            const label = typeof serviceTypeLabel === "function"
                ? serviceTypeLabel(item.serviceType)
                : item.serviceType;

            return {
                label,
                value: item.count,
                percent: total > 0 ? item.count / total * 100 : 0
            };
        });

    renderHorizontalBarChart("chartServiceTypes", rows, "Немає даних по типах звернень");
}

function renderLocationsChart(analytics) {
    const rows = (Array.isArray(analytics.topLocations) ? analytics.topLocations : [])
        .map(normalizeLocationAnalytics)
        .filter(item => Number(item.ordersCount) > 0)
        .sort((a, b) => Number(b.sharePercent) - Number(a.sharePercent))
        .slice(0, 5)
        .map(item => ({
            label: item.locationLabel,
            value: item.ordersCount,
            percent: item.sharePercent
        }));

    renderHorizontalBarChart("chartLocations", rows, "Немає даних по локаціях");
}

function renderAnalyticsCharts(analytics) {
    renderOrdersStatusChart(analytics);
    renderSpecialistShareChart(analytics);
    renderServiceTypesChart(analytics);
    renderLocationsChart(analytics);
}

/* ===================== BONUS RECOMMENDATION ===================== */

function normalizeBonusRecommendation(item) {
    if (!item) {
        return {
            hasCandidate: false,
            reason: "Немає достатніх даних для формування рекомендації."
        };
    }

    return {
        hasCandidate: item.hasCandidate ?? item.has_candidate ?? false,
        specialistId: item.specialistId || item.specialist_id || "",
        fullName: item.fullName || item.full_name || "—",

        ratingPercent: item.ratingPercent ?? item.rating_percent ?? 0,

        completedCount: item.completedCount ?? item.completed_count ?? 0,
        assignedCount: item.assignedCount ?? item.assigned_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,

        sharePercent: item.sharePercent ?? item.share_percent ?? 0,
        completionRatePercent: item.completionRatePercent ?? item.completion_rate_percent ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,

        reason: item.reason || "Немає пояснення рекомендації."
    };
}

function renderBonusRecommendation(item) {
    const container = document.getElementById("analyticsBonusRecommendation");
    if (!container) return;

    const recommendation = normalizeBonusRecommendation(item);

    if (!recommendation.hasCandidate) {
        container.innerHTML = `
            <div class="empty-box">
                ${escapeHtml(recommendation.reason)}
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="order-details-grid">
            <div class="order-detail-field">
                <div class="order-detail-label">Рекомендований спеціаліст</div>
                <div class="order-detail-value">${escapeHtml(recommendation.fullName)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Рейтинг</div>
                <div class="order-detail-value">
                    <span class="analytics-kpi ${getKpiClass(recommendation.ratingPercent)}">
                        ${escapeHtml(formatPercent(recommendation.ratingPercent))}
                    </span>
                </div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Призначено</div>
                <div class="order-detail-value">${escapeHtml(formatAnalyticsNumber(recommendation.assignedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Виконано</div>
                <div class="order-detail-value">${escapeHtml(formatAnalyticsNumber(recommendation.completedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги</div>
                <div class="order-detail-value">${escapeHtml(formatAnalyticsNumber(recommendation.complaintsCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Частка</div>
                <div class="order-detail-value">${escapeHtml(formatPercent(recommendation.sharePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% виконання</div>
                <div class="order-detail-value">${escapeHtml(formatPercent(recommendation.completionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% скарг</div>
                <div class="order-detail-value">${escapeHtml(formatPercent(recommendation.complaintRatePercent))}</div>
            </div>

            <div class="order-detail-field full">
                <div class="order-detail-label">Пояснення</div>
                <div class="order-detail-value long-text">${escapeHtml(recommendation.reason)}</div>
            </div>
        </div>
    `;
}

/* ===================== SPECIALISTS ===================== */

function normalizeSpecialistAnalytics(item) {
    return {
        specialistId: item.specialistId || item.specialist_id || "",
        fullName: item.fullName || item.full_name || item.specialistName || item.specialist_name || "—",
        assignedCount: item.assignedCount ?? item.assigned_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        activeCount: item.activeCount ?? item.active_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        reworkCount: item.reworkCount ?? item.rework_count ?? 0,
        completionRatePercent: item.completionRatePercent ?? item.completion_rate_percent ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        efficiencyPercent: item.efficiencyPercent ?? item.efficiency_percent ?? 0
    };
}

function getKpiClass(value) {
    const number = Number(value);

    if (number >= 80) return "analytics-kpi-good";
    if (number >= 50) return "analytics-kpi-medium";

    return "analytics-kpi-bad";
}

function renderSpecialistsAnalytics(items) {
    const body = document.getElementById("analyticsSpecialists");
    if (!body) return;

    body.innerHTML = "";

    const rows = Array.isArray(items)
        ? items.map(normalizeSpecialistAnalytics)
        : [];

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="9"><div class="empty-box">Немає даних по спеціалістах</div></td></tr>`;
        return;
    }

    rows
        .sort((a, b) => Number(b.efficiencyPercent) - Number(a.efficiencyPercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.assignedCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.activeCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.reworkCount))}</td>
                <td>${escapeHtml(formatPercent(item.completionRatePercent))}</td>
                <td>${escapeHtml(formatPercent(item.complaintRatePercent))}</td>
                <td>
                    <span class="analytics-kpi ${getKpiClass(item.efficiencyPercent)}">
                        ${escapeHtml(formatPercent(item.efficiencyPercent))}
                    </span>
                </td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== COMPLAINERS ===================== */

function normalizeComplainer(item) {
    return {
        workerId: item.workerId || item.worker_id || "",
        fullName: item.fullName || item.full_name || item.workerName || item.worker_name || "—",
        ordersCount: item.ordersCount ?? item.orders_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,

        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        complaintSharePercent: item.complaintSharePercent ?? item.complaint_share_percent ?? 0
    };
}

function renderTopComplainers(items) {
    const body = document.getElementById("analyticsComplainers");
    if (!body) return;

    body.innerHTML = "";

    const rows = Array.isArray(items)
        ? items.map(normalizeComplainer)
        : [];

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="5"><div class="empty-box">Скарг за період немає</div></td></tr>`;
        return;
    }

    rows
        .sort((a, b) => Number(b.complaintsCount) - Number(a.complaintsCount))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(formatPercent(item.complaintRatePercent))}</td>
                <td>${escapeHtml(formatPercent(item.complaintSharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== REQUESTERS ===================== */

function normalizeRequester(item) {
    return {
        workerId: item.workerId || item.worker_id || "",
        fullName: item.fullName || item.full_name || item.workerName || item.worker_name || "—",
        ordersCount: item.ordersCount ?? item.orders_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        activeCount: item.activeCount ?? item.active_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        sharePercent: item.sharePercent ?? item.share_percent ?? 0
    };
}

function renderTopRequesters(items) {
    const body = document.getElementById("analyticsRequesters");
    if (!body) return;

    body.innerHTML = "";

    const rows = Array.isArray(items)
        ? items.map(normalizeRequester)
        : [];

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="6"><div class="empty-box">Немає даних по заявниках</div></td></tr>`;
        return;
    }

    rows
        .sort((a, b) => Number(b.sharePercent) - Number(a.sharePercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.activeCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(formatPercent(item.sharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== LOCATIONS ===================== */

function normalizeLocationAnalytics(item) {
    const workshop = item.productionWorkshopNumber ?? item.production_workshop_number ?? 0;
    const floor = item.floorNumber ?? item.floor_number ?? 0;
    const room = item.roomNumber ?? item.room_number ?? 0;

    return {
        locationLabel: `Цех ${workshop}, поверх ${floor}, кімната ${room}`,
        ordersCount: item.ordersCount ?? item.orders_count ?? 0,
        sharePercent: item.sharePercent ?? item.share_percent ?? 0
    };
}

function renderTopLocations(items) {
    const body = document.getElementById("analyticsLocations");
    if (!body) return;

    body.innerHTML = "";

    const rows = Array.isArray(items)
        ? items.map(normalizeLocationAnalytics)
        : [];

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="3"><div class="empty-box">Немає даних по локаціях</div></td></tr>`;
        return;
    }

    rows
        .sort((a, b) => Number(b.sharePercent) - Number(a.sharePercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.locationLabel)}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(formatPercent(item.sharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== SERVICE TYPES ===================== */

function normalizeServiceType(item) {
    return {
        serviceType: item.serviceType || item.service_type || "—",
        count: item.count ?? item.ordersCount ?? item.orders_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0
    };
}

function renderServiceTypes(items) {
    const body = document.getElementById("analyticsServiceTypes");
    if (!body) return;

    body.innerHTML = "";

    const rows = Array.isArray(items)
        ? items.map(normalizeServiceType)
        : [];

    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="4"><div class="empty-box">Немає даних по типах звернень</div></td></tr>`;
        return;
    }

    rows
        .sort((a, b) => Number(b.count) - Number(a.count))
        .forEach(item => {
            const label = typeof serviceTypeLabel === "function"
                ? serviceTypeLabel(item.serviceType)
                : item.serviceType;

            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(label)}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.count))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(formatAnalyticsNumber(item.complaintsCount))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== MAIN RENDER ===================== */

function renderAnalytics(data) {
    const analytics = normalizeAnalytics(data || {});

    renderAnalyticsSummary(analytics);
    renderAnalyticsCharts(analytics);

    renderBonusRecommendation(analytics.bonusRecommendation);
    renderSpecialistsAnalytics(analytics.specialists);

    renderTopComplainers(analytics.topComplainers);
    renderTopRequesters(analytics.topRequesters);
    renderTopLocations(analytics.topLocations);

    renderServiceTypes(analytics.serviceTypes);
}

async function loadAnalytics() {
    if (typeof activeTab !== "undefined" && activeTab !== "analytics") return;

    try {
        setStatus("Завантаження аналітики...");

        await fillAnalyticsSpecialistsFilter();

        const filters = getAnalyticsFilters();

        if (typeof fetchBossAnalytics !== "function") {
            renderAnalytics({});
            setStatus("Backend для аналітики ще не підключено", true);
            return;
        }

        const data = await fetchBossAnalytics(
            filters.from,
            filters.to,
            filters.specialistId
        );

        renderAnalytics(data);

        setStatus("Аналітику завантажено");
    }
    catch (e) {
        console.error(e);

        renderAnalytics({});

        setStatus("Помилка завантаження аналітики: " + e.message, true);
    }
}