let analyticsSpecialistsLoaded = false;

/* ===================== BASIC HELPERS ===================== */

function analyticsNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : "0";
}

function analyticsRawNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function analyticsPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : "0%";
}

function analyticsClampPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return 0;
    if (number < 0) return 0;
    if (number > 100) return 100;

    return number;
}

function analyticsNormalizeId(value) {
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

function analyticsSetText(id, text) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = text;
    }
}

function getTodayInputValue() {
    return new Date().toISOString().slice(0, 10);
}

function getMonthStartInputValue() {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
}

function setInputValueIfEmpty(id, value) {
    const input = document.getElementById(id);

    if (input && !input.value) {
        input.value = value;
    }
}

function setTableEmpty(tbody, colspan, message) {
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}">
                <div class="empty-box">${escapeHtml(message)}</div>
            </td>
        </tr>
    `;
}

function setTableError(tbody, colspan, message) {
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}">
                <div class="error-box">${escapeHtml(message)}</div>
            </td>
        </tr>
    `;
}

function analyticsKpiClass(value) {
    const number = Number(value);

    if (number >= 80) return "analytics-kpi-good";
    if (number >= 50) return "analytics-kpi-medium";

    return "analytics-kpi-bad";
}

function analyticsKpi(value) {
    return `
        <span class="analytics-kpi ${analyticsKpiClass(value)}">
            ${escapeHtml(analyticsPercent(value))}
        </span>
    `;
}

function analyticsBadKpiClass(value) {
    const number = Number(value);

    if (number <= 10) return "analytics-kpi-good";
    if (number <= 30) return "analytics-kpi-medium";

    return "analytics-kpi-bad";
}

function analyticsBadKpi(value) {
    return `
        <span class="analytics-kpi ${analyticsBadKpiClass(value)}">
            ${escapeHtml(analyticsPercent(value))}
        </span>
    `;
}

function analyticsFormatServiceType(value) {
    if (typeof formatServiceType === "function") {
        return formatServiceType(value);
    }

    const key = String(value || "").trim().toUpperCase();

    const labels = {
        ELECTRICAL: "Електроживлення / електрика",
        PC_PROBLEM: "Проблема з комп’ютером",
        PRINTER_PROBLEM: "Проблема з принтером",
        SOFTWARE_BUG: "Баг програмного забезпечення",
        INTERNET: "Інтернет / мережа",
        SEAL_DAMAGE: "Відсутня пломба / пошкоджена",
        AUDIO_VIDEO: "Проблема з відео/аудіо обладнанням",
        PLUMBING: "Сантехніка",
        HEATING: "Опалення",
        OTHER: "Інше"
    };

    return labels[key] || value || "—";
}

/* ===================== FILTERS ===================== */

function initBossAnalyticsFilters() {
    setInputValueIfEmpty("analyticsFrom", getMonthStartInputValue());
    setInputValueIfEmpty("analyticsTo", getTodayInputValue());
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
        specialistId: analyticsNormalizeId(
            document.getElementById("analyticsSpecialistFilter")?.value || ""
        )
    };
}

function getSelectedAnalyticsSpecialistId() {
    return analyticsNormalizeId(
        document.getElementById("analyticsSpecialistFilter")?.value || ""
    );
}

function getSelectedSpecialistNameById(specialistId) {
    const select = document.getElementById("analyticsSpecialistFilter");

    if (!select || !specialistId) {
        return "—";
    }

    const option = Array.from(select.options).find(x =>
        analyticsNormalizeId(x.value) === analyticsNormalizeId(specialistId)
    );

    return option?.textContent || specialistId;
}

async function fillAnalyticsSpecialistsFilter() {
    const select = document.getElementById("analyticsSpecialistFilter");

    if (!select || analyticsSpecialistsLoaded) {
        return;
    }

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
                id: analyticsNormalizeId(
                    specialist.id ||
                    specialist.Id ||
                    specialist._id
                ),
                fullName:
                    specialist.fullName ||
                    specialist.FullName ||
                    specialist.full_name ||
                    specialist.login ||
                    specialist.Login ||
                    "—",
                accountStatus:
                    specialist.accountStatus ||
                    specialist.account_status ||
                    ""
            }))
            .filter(specialist => specialist.id)
            .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), "uk"))
            .forEach(specialist => {
                const label = specialist.accountStatus === "INACTIVE"
                    ? `${specialist.fullName} (неактивний)`
                    : specialist.fullName;

                select.appendChild(new Option(label, specialist.id));
            });

        analyticsSpecialistsLoaded = true;
    } catch (e) {
        console.error(e);
        setStatus("Не вдалося завантажити список спеціалістів: " + e.message, true);
    }
}

/* ===================== MODE TITLES ===================== */

function setAnalyticsModeTitles(selectedSpecialist = null) {
    if (selectedSpecialist) {
        analyticsSetText(
            "analyticsChartsTitle",
            "Графічне представлення аналітики спеціаліста"
        );

        analyticsSetText(
            "analyticsChartsSubtitle",
            "Візуалізація показників по вибраному спеціалісту за обраний період"
        );

        analyticsSetText(
            "chartOrdersStatusTitle",
            "Стан заявок спеціаліста"
        );

        analyticsSetText(
            "chartOrdersStatusSubtitle",
            "Розподіл заявок вибраного спеціаліста за основними показниками"
        );

        analyticsSetText(
            "chartSpecialistShareTitle",
            "Частка вибраного спеціаліста"
        );

        analyticsSetText(
            "chartSpecialistShareSubtitle",
            "Внесок спеціаліста у виконані заявки відділу"
        );

        analyticsSetText(
            "chartServiceTypesTitle",
            "Типи звернень спеціаліста"
        );

        analyticsSetText(
            "chartServiceTypesSubtitle",
            "Категорії заявок, які були призначені вибраному спеціалісту"
        );

        analyticsSetText(
            "chartLocationsTitle",
            "Локації заявок спеціаліста"
        );

        analyticsSetText(
            "chartLocationsSubtitle",
            "Де знаходились заявки вибраного спеціаліста"
        );

        analyticsSetText(
            "analyticsBonusTitle",
            "Оцінка вибраного спеціаліста"
        );

        analyticsSetText(
            "analyticsBonusSubtitle",
            "Показує індивідуальний рейтинг, виконання, скарги та частку вибраного спеціаліста серед усіх виконаних заявок"
        );

        analyticsSetText(
            "analyticsSpecialistsTitle",
            "Показники вибраного спеціаліста"
        );

        analyticsSetText(
            "analyticsSpecialistsSubtitle",
            "У таблиці відображено тільки вибраного спеціаліста за обраний період"
        );

        analyticsSetText(
            "analyticsComplainersTitle",
            "Хто подавав скарги по цьому спеціалісту"
        );

        analyticsSetText(
            "analyticsComplainersSubtitle",
            "Показує скарги працівників по заявках, які були призначені вибраному спеціалісту"
        );

        analyticsSetText(
            "analyticsServiceTypesTitle",
            "Типи звернень спеціаліста"
        );

        analyticsSetText(
            "analyticsServiceTypesSubtitle",
            "Які типи заявок найчастіше обробляв вибраний спеціаліст"
        );

        analyticsSetText(
            "analyticsRequestersTitle",
            "Хто створював заявки для цього спеціаліста"
        );

        analyticsSetText(
            "analyticsRequestersSubtitle",
            "Працівники, заявки яких були призначені вибраному спеціалісту"
        );

        analyticsSetText(
            "analyticsLocationsTitle",
            "Локації заявок спеціаліста"
        );

        analyticsSetText(
            "analyticsLocationsSubtitle",
            "Де знаходились заявки, які обробляв вибраний спеціаліст"
        );

        return;
    }

    analyticsSetText(
        "analyticsChartsTitle",
        "Графічне представлення аналітики"
    );

    analyticsSetText(
        "analyticsChartsSubtitle",
        "Візуалізація основних показників для швидкого аналізу стану заявок"
    );

    analyticsSetText(
        "chartOrdersStatusTitle",
        "Стан заявок"
    );

    analyticsSetText(
        "chartOrdersStatusSubtitle",
        "Розподіл заявок за основними показниками"
    );

    analyticsSetText(
        "chartSpecialistShareTitle",
        "Частка спеціалістів"
    );

    analyticsSetText(
        "chartSpecialistShareSubtitle",
        "Внесок спеціалістів у виконані заявки"
    );

    analyticsSetText(
        "chartServiceTypesTitle",
        "Типи звернень"
    );

    analyticsSetText(
        "chartServiceTypesSubtitle",
        "Найпопулярніші категорії заявок"
    );

    analyticsSetText(
        "chartLocationsTitle",
        "Проблемні локації"
    );

    analyticsSetText(
        "chartLocationsSubtitle",
        "Де найчастіше створюються заявки"
    );

    analyticsSetText(
        "analyticsBonusTitle",
        "Рекомендація на премію"
    );

    analyticsSetText(
        "analyticsBonusSubtitle",
        "Система пропонує кандидата на основі частки виконаних заявок, відсотка виконання та рівня скарг"
    );

    analyticsSetText(
        "analyticsSpecialistsTitle",
        "Ефективність спеціалістів"
    );

    analyticsSetText(
        "analyticsSpecialistsSubtitle",
        "Частка показує, який відсоток від усіх виконаних заявок за період виконав конкретний спеціаліст"
    );

    analyticsSetText(
        "analyticsComplainersTitle",
        "Хто найчастіше подає скарги"
    );

    analyticsSetText(
        "analyticsComplainersSubtitle",
        "Показує частоту скарг працівника відносно його заявок та його частку серед усіх скарг за період"
    );

    analyticsSetText(
        "analyticsServiceTypesTitle",
        "Типи звернень"
    );

    analyticsSetText(
        "analyticsServiceTypesSubtitle",
        "Які послуги найчастіше замовляють працівники"
    );

    analyticsSetText(
        "analyticsRequestersTitle",
        "Хто найчастіше подає заявки"
    );

    analyticsSetText(
        "analyticsRequestersSubtitle",
        "Частка показує, який відсоток від усіх заявок за період створив конкретний працівник"
    );

    analyticsSetText(
        "analyticsLocationsTitle",
        "Де найчастіше трапляються поломки"
    );

    analyticsSetText(
        "analyticsLocationsSubtitle",
        "Частка показує, який відсоток від усіх заявок припадає на конкретну локацію"
    );
}

/* ===================== NORMALIZATION ===================== */

function normalizeAnalytics(data = {}) {
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

function normalizeSpecialistAnalytics(item = {}) {
    return {
        specialistId: analyticsNormalizeId(
            item.specialistId ||
            item.SpecialistId ||
            item.specialist_id ||
            item.id ||
            item.Id ||
            item._id ||
            ""
        ),
        fullName:
            item.fullName ||
            item.FullName ||
            item.full_name ||
            item.specialistName ||
            item.specialist_name ||
            "—",
        assignedCount: item.assignedCount ?? item.assigned_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        activeCount: item.activeCount ?? item.active_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        reworkCount: item.reworkCount ?? item.rework_count ?? 0,
        completionRatePercent: item.completionRatePercent ?? item.completion_rate_percent ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        efficiencyPercent: item.efficiencyPercent ?? item.efficiency_percent ?? item.sharePercent ?? item.share_percent ?? 0
    };
}

function normalizeComplainer(item = {}) {
    return {
        workerId: item.workerId || item.worker_id || "",
        fullName: item.fullName || item.full_name || item.workerName || item.worker_name || "—",
        ordersCount: item.ordersCount ?? item.orders_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        complaintSharePercent: item.complaintSharePercent ?? item.complaint_share_percent ?? 0
    };
}

function normalizeRequester(item = {}) {
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

function normalizeLocationAnalytics(item = {}) {
    const workshop = item.productionWorkshopNumber ?? item.production_workshop_number ?? 0;
    const floor = item.floorNumber ?? item.floor_number ?? 0;
    const room = item.roomNumber ?? item.room_number ?? 0;

    return {
        locationLabel: `Цех ${workshop}, поверх ${floor}, кімната ${room}`,
        ordersCount: item.ordersCount ?? item.orders_count ?? 0,
        sharePercent: item.sharePercent ?? item.share_percent ?? 0
    };
}

function normalizeServiceType(item = {}) {
    return {
        serviceType: item.serviceType || item.service_type || "—",
        count: item.count ?? item.ordersCount ?? item.orders_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0
    };
}

function normalizeBonusRecommendation(item) {
    if (!item) {
        return {
            hasCandidate: false,
            reason: "Немає достатніх даних для формування рекомендації."
        };
    }

    return {
        hasCandidate: item.hasCandidate ?? item.has_candidate ?? false,
        specialistId: analyticsNormalizeId(item.specialistId || item.specialist_id || ""),
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

/* ===================== SELECTED SPECIALIST LOGIC ===================== */

function findSpecialistInAnalytics(analytics, specialistId) {
    const selectedId = analyticsNormalizeId(specialistId);

    if (!selectedId) {
        return null;
    }

    const rows = Array.isArray(analytics.specialists)
        ? analytics.specialists.map(normalizeSpecialistAnalytics)
        : [];

    return rows.find(x =>
        analyticsNormalizeId(x.specialistId) === selectedId
    ) || null;
}

function buildSelectedSpecialistAnalytics(personalAnalytics, overallAnalytics, specialistId) {
    const selectedId = analyticsNormalizeId(specialistId);

    const personalRow = findSpecialistInAnalytics(personalAnalytics, selectedId);
    const overallRow = findSpecialistInAnalytics(overallAnalytics, selectedId);

    const assignedCount =
        personalRow?.assignedCount ??
        personalAnalytics.totalOrders ??
        0;

    const completedCount =
        personalRow?.completedCount ??
        personalAnalytics.completedOrders ??
        0;

    const activeCount =
        personalRow?.activeCount ??
        personalAnalytics.activeOrders ??
        0;

    const complaintsCount =
        personalRow?.complaintsCount ??
        personalAnalytics.complaintsCount ??
        0;

    const reworkCount =
        personalRow?.reworkCount ??
        personalAnalytics.reworkCount ??
        0;

    const completionRatePercent =
        personalRow?.completionRatePercent ??
        (
            Number(assignedCount) > 0
                ? Number(completedCount) / Number(assignedCount) * 100
                : 0
        );

    const complaintRatePercent =
        personalRow?.complaintRatePercent ??
        (
            Number(assignedCount) > 0
                ? Number(complaintsCount) / Number(assignedCount) * 100
                : 0
        );

    const efficiencyPercent =
        overallRow?.efficiencyPercent ??
        0;

    return {
        specialistId: selectedId,
        fullName:
            overallRow?.fullName ||
            personalRow?.fullName ||
            getSelectedSpecialistNameById(selectedId),

        assignedCount,
        completedCount,
        activeCount,
        complaintsCount,
        reworkCount,
        completionRatePercent,
        complaintRatePercent,
        efficiencyPercent
    };
}

function calculateSelectedSpecialistRating(item) {
    const efficiency = analyticsRawNumber(item.efficiencyPercent);
    const completionRate = analyticsRawNumber(item.completionRatePercent);
    const complaintRate = analyticsRawNumber(item.complaintRatePercent);

    return 0.4 * efficiency + 0.4 * completionRate + 0.2 * (100 - complaintRate);
}

function isSpecialistBonusEligible(item) {
    return (
        analyticsRawNumber(item.assignedCount) > 0 &&
        analyticsRawNumber(item.completedCount) > 0 &&
        analyticsRawNumber(item.complaintRatePercent) <= 30
    );
}

/* ===================== SUMMARY ===================== */

function getAnalyticsSummaryCard(label, value) {
    return `
        <div class="analytics-card">
            <div class="analytics-card-label">${escapeHtml(label)}</div>
            <div class="analytics-card-value">${escapeHtml(value)}</div>
        </div>
    `;
}

function renderAnalyticsSummary(data, selectedSpecialist = null) {
    const container = document.getElementById("analyticsSummary");
    if (!container) return;

    if (selectedSpecialist) {
        container.innerHTML = [
            getAnalyticsSummaryCard("Заявки спеціаліста", analyticsNumber(selectedSpecialist.assignedCount)),
            getAnalyticsSummaryCard("Виконано", analyticsNumber(selectedSpecialist.completedCount)),
            getAnalyticsSummaryCard("Активні", analyticsNumber(selectedSpecialist.activeCount)),
            getAnalyticsSummaryCard("Скарги", analyticsNumber(selectedSpecialist.complaintsCount)),
            getAnalyticsSummaryCard("Переробки", analyticsNumber(selectedSpecialist.reworkCount)),
            getAnalyticsSummaryCard("Частка серед виконаних", analyticsPercent(selectedSpecialist.efficiencyPercent))
        ].join("");

        return;
    }

    container.innerHTML = [
        getAnalyticsSummaryCard("Усього заявок", analyticsNumber(data.totalOrders)),
        getAnalyticsSummaryCard("Виконано", analyticsNumber(data.completedOrders)),
        getAnalyticsSummaryCard("Активні", analyticsNumber(data.activeOrders)),
        getAnalyticsSummaryCard("Скарги", analyticsNumber(data.complaintsCount)),
        getAnalyticsSummaryCard("Переробки", analyticsNumber(data.reworkCount)),
        getAnalyticsSummaryCard("Середня ефективність", analyticsPercent(data.averageEfficiencyPercent))
    ].join("");
}

/* ===================== CHARTS ===================== */

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
        const percent = analyticsClampPercent(row.percent ?? 0);

        const item = document.createElement("div");
        item.className = "analytics-chart-row";

        item.innerHTML = `
            <div class="analytics-chart-label">${escapeHtml(label)}</div>

            <div class="analytics-chart-track">
                <div class="analytics-chart-fill" style="width: ${percent}%"></div>
            </div>

            <div class="analytics-chart-value">
                ${escapeHtml(analyticsNumber(value))} · ${escapeHtml(analyticsPercent(percent))}
            </div>
        `;

        container.appendChild(item);
    });
}

function renderOrdersStatusChart(analytics) {
    const total = Number(analytics.totalOrders) || 0;

    renderHorizontalBarChart(
        "chartOrdersStatus",
        [
            { label: "Усього заявок", value: analytics.totalOrders, percent: total > 0 ? 100 : 0 },
            { label: "Виконано", value: analytics.completedOrders, percent: total > 0 ? analytics.completedOrders / total * 100 : 0 },
            { label: "Активні", value: analytics.activeOrders, percent: total > 0 ? analytics.activeOrders / total * 100 : 0 },
            { label: "Скарги", value: analytics.complaintsCount, percent: total > 0 ? analytics.complaintsCount / total * 100 : 0 },
            { label: "Переробки", value: analytics.reworkCount, percent: total > 0 ? analytics.reworkCount / total * 100 : 0 }
        ],
        "Немає заявок за обраний період"
    );
}

function renderSpecialistShareChart(analytics, selectedSpecialist = null) {
    if (selectedSpecialist) {
        renderHorizontalBarChart(
            "chartSpecialistShare",
            [
                {
                    label: selectedSpecialist.fullName,
                    value: selectedSpecialist.completedCount,
                    percent: selectedSpecialist.efficiencyPercent
                }
            ],
            "Немає виконаних заявок по вибраному спеціалісту"
        );

        return;
    }

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
        .map(item => ({
            label: analyticsFormatServiceType(item.serviceType),
            value: item.count,
            percent: total > 0 ? item.count / total * 100 : 0
        }));

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

function renderAnalyticsCharts(analytics, selectedSpecialist = null) {
    renderOrdersStatusChart(analytics);
    renderSpecialistShareChart(analytics, selectedSpecialist);
    renderServiceTypesChart(analytics);
    renderLocationsChart(analytics);
}

/* ===================== BONUS ===================== */

function renderBonusRecommendation(item) {
    const container = document.getElementById("analyticsBonusRecommendation");
    if (!container) return;

    const selectedSpecialistId = getSelectedAnalyticsSpecialistId();

    if (selectedSpecialistId) {
        container.innerHTML = `
            <div class="empty-box">
                Завантаження індивідуальної оцінки спеціаліста...
            </div>
        `;
        return;
    }

    const recommendation = normalizeBonusRecommendation(item);

    if (!recommendation.hasCandidate) {
        container.innerHTML = `<div class="empty-box">${escapeHtml(recommendation.reason)}</div>`;
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
                <div class="order-detail-value">${analyticsKpi(recommendation.ratingPercent)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Призначено</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(recommendation.assignedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Виконано</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(recommendation.completedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(recommendation.complaintsCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Частка</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.sharePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% виконання</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.completionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% скарг</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.complaintRatePercent))}</div>
            </div>

            <div class="order-detail-field full">
                <div class="order-detail-label">Пояснення</div>
                <div class="order-detail-value long-text">${escapeHtml(recommendation.reason)}</div>
            </div>
        </div>
    `;
}

function renderSelectedSpecialistBonusBlock(item) {
    const container = document.getElementById("analyticsBonusRecommendation");
    if (!container) return;

    const ratingPercent = calculateSelectedSpecialistRating(item);
    const eligible = isSpecialistBonusEligible(item);

    const reason = eligible
        ? "Спеціаліст проходить базові умови преміювання: має призначені та виконані заявки, а рівень скарг не перевищує 30%."
        : "Спеціаліст не проходить базові умови преміювання або має недостатньо даних за вибраний період.";

    container.innerHTML = `
        <div class="order-details-grid">
            <div class="order-detail-field">
                <div class="order-detail-label">Оцінка вибраного спеціаліста</div>
                <div class="order-detail-value">${escapeHtml(item.fullName)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Індивідуальний рейтинг</div>
                <div class="order-detail-value">${analyticsKpi(ratingPercent)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Призначено</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(item.assignedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Виконано</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(item.completedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Активні</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(item.activeCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Переробки</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(item.reworkCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(item.complaintsCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Частка серед виконаних</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(item.efficiencyPercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% виконання</div>
                <div class="order-detail-value">${analyticsKpi(item.completionRatePercent)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% скарг</div>
                <div class="order-detail-value">${analyticsBadKpi(item.complaintRatePercent)}</div>
            </div>

            <div class="order-detail-field full">
                <div class="order-detail-label">Пояснення</div>
                <div class="order-detail-value long-text">${escapeHtml(reason)}</div>
            </div>
        </div>
    `;
}

/* ===================== TABLE RENDERERS ===================== */

function renderSpecialistsAnalytics(items, selectedSpecialist = null) {
    const body = document.getElementById("analyticsSpecialists");
    if (!body) return;

    let rows = Array.isArray(items) ? items.map(normalizeSpecialistAnalytics) : [];

    if (selectedSpecialist) {
        rows = [selectedSpecialist];
    }

    if (rows.length === 0) {
        setTableEmpty(body, 9, "Немає даних по спеціалістах");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.efficiencyPercent) - Number(a.efficiencyPercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(analyticsNumber(item.assignedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.activeCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.reworkCount))}</td>
                <td>${escapeHtml(analyticsPercent(item.completionRatePercent))}</td>
                <td>${escapeHtml(analyticsPercent(item.complaintRatePercent))}</td>
                <td>${analyticsKpi(item.efficiencyPercent)}</td>
            `;

            body.appendChild(tr);
        });
}

function renderTopComplainers(items) {
    const body = document.getElementById("analyticsComplainers");
    if (!body) return;

    const rows = Array.isArray(items) ? items.map(normalizeComplainer) : [];

    if (rows.length === 0) {
        setTableEmpty(body, 5, "Скарг за період немає");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.complaintsCount) - Number(a.complaintsCount))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(analyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(analyticsPercent(item.complaintRatePercent))}</td>
                <td>${escapeHtml(analyticsPercent(item.complaintSharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

function renderTopRequesters(items) {
    const body = document.getElementById("analyticsRequesters");
    if (!body) return;

    const rows = Array.isArray(items) ? items.map(normalizeRequester) : [];

    if (rows.length === 0) {
        setTableEmpty(body, 6, "Немає даних по заявниках");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.sharePercent) - Number(a.sharePercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(analyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.activeCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
                <td>${escapeHtml(analyticsPercent(item.sharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

function renderTopLocations(items) {
    const body = document.getElementById("analyticsLocations");
    if (!body) return;

    const rows = Array.isArray(items) ? items.map(normalizeLocationAnalytics) : [];

    if (rows.length === 0) {
        setTableEmpty(body, 3, "Немає даних по локаціях");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.sharePercent) - Number(a.sharePercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.locationLabel)}</td>
                <td>${escapeHtml(analyticsNumber(item.ordersCount))}</td>
                <td>${escapeHtml(analyticsPercent(item.sharePercent))}</td>
            `;

            body.appendChild(tr);
        });
}

function renderServiceTypes(items) {
    const body = document.getElementById("analyticsServiceTypes");
    if (!body) return;

    const rows = Array.isArray(items) ? items.map(normalizeServiceType) : [];

    if (rows.length === 0) {
        setTableEmpty(body, 4, "Немає даних по типах звернень");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.count) - Number(a.count))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(analyticsFormatServiceType(item.serviceType))}</td>
                <td>${escapeHtml(analyticsNumber(item.count))}</td>
                <td>${escapeHtml(analyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== MAIN RENDER ===================== */

function renderAnalytics(data, context = {}) {
    const analytics = normalizeAnalytics(data || {});
    const selectedSpecialist = context.selectedSpecialist || null;

    setAnalyticsModeTitles(selectedSpecialist);

    renderAnalyticsSummary(analytics, selectedSpecialist);
    renderAnalyticsCharts(analytics, selectedSpecialist);

    if (selectedSpecialist) {
        renderSelectedSpecialistBonusBlock(selectedSpecialist);
    } else {
        renderBonusRecommendation(analytics.bonusRecommendation);
    }

    renderSpecialistsAnalytics(analytics.specialists, selectedSpecialist);
    renderTopComplainers(analytics.topComplainers);
    renderTopRequesters(analytics.topRequesters);
    renderTopLocations(analytics.topLocations);
    renderServiceTypes(analytics.serviceTypes);
}

async function loadAnalytics() {
    if (typeof activeTab !== "undefined" && activeTab !== "analytics") {
        return;
    }

    try {
        setStatus("Завантаження аналітики...");

        await fillAnalyticsSpecialistsFilter();

        const filters = getAnalyticsFilters();

        if (typeof fetchBossAnalytics !== "function") {
            renderAnalytics({});
            setStatus("Backend для аналітики ще не підключено", true);
            return;
        }

        if (filters.specialistId) {
            const [overallRaw, personalRaw] = await Promise.all([
                fetchBossAnalytics(filters.from, filters.to, ""),
                fetchBossAnalytics(filters.from, filters.to, filters.specialistId)
            ]);

            const overallAnalytics = normalizeAnalytics(overallRaw || {});
            const personalAnalytics = normalizeAnalytics(personalRaw || {});

            const selectedSpecialist = buildSelectedSpecialistAnalytics(
                personalAnalytics,
                overallAnalytics,
                filters.specialistId
            );

            renderAnalytics(personalRaw, {
                selectedSpecialist
            });

            setStatus("Аналітику вибраного спеціаліста завантажено");
            return;
        }

        const data = await fetchBossAnalytics(
            filters.from,
            filters.to,
            ""
        );

        renderAnalytics(data);
        setStatus("Аналітику завантажено");
    } catch (e) {
        console.error(e);

        renderAnalytics({});
        setStatus("Помилка завантаження аналітики: " + e.message, true);
    }
}

/* ===================== GLOBAL EXPORTS ===================== */

window.initBossAnalyticsFilters = initBossAnalyticsFilters;
window.resetAnalyticsFilters = resetAnalyticsFilters;
window.loadAnalytics = loadAnalytics;
window.fillAnalyticsSpecialistsFilter = fillAnalyticsSpecialistsFilter;