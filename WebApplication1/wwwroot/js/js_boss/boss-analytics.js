let analyticsSpecialistsLoaded = false;

/* ===================== BASIC HELPERS ===================== */

function analyticsNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : "0";
}

function analyticsPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : "0%";
}

function analyticsSignedPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0%";
    }

    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toFixed(1)}%`;
}

function analyticsClampPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return 0;
    if (number < 0) return 0;
    if (number > 100) return 100;

    return number;
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

    if (number >= 70) return "analytics-kpi-good";
    if (number >= 40) return "analytics-kpi-medium";

    return "analytics-kpi-bad";
}

function analyticsKpi(value) {
    return `
        <span class="analytics-kpi ${analyticsKpiClass(value)}">
            ${escapeHtml(analyticsPercent(value))}
        </span>
    `;
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
        specialistId: document.getElementById("analyticsSpecialistFilter")?.value || ""
    };
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

                select.appendChild(new Option(label, specialist.id));
            });

        analyticsSpecialistsLoaded = true;
    } catch (e) {
        console.error(e);
        setStatus("Не вдалося завантажити список спеціалістів: " + e.message, true);
    }
}

/* ===================== NORMALIZATION ===================== */

function normalizeAnalytics(data = {}) {
    return {
        totalOrders: data.totalOrders ?? data.total_orders ?? 0,
        completedOrders: data.completedOrders ?? data.completed_orders ?? 0,
        canceledOrders: data.canceledOrders ?? data.canceled_orders ?? 0,
        activeOrders: data.activeOrders ?? data.active_orders ?? 0,
        complaintsCount: data.complaintsCount ?? data.complaints_count ?? 0,
        reworkCount: data.reworkCount ?? data.rework_count ?? 0,
        isPersonalized: data.isPersonalized ?? data.is_personalized ?? false,
        selectedSpecialistId: data.selectedSpecialistId ?? data.selected_specialist_id ?? "",
        selectedSpecialistName: data.selectedSpecialistName ?? data.selected_specialist_name ?? "",
        averageEfficiencyPercent: data.averageEfficiencyPercent ?? data.average_efficiency_percent ?? 0,
        leaderEfficiencyPercent: data.leaderEfficiencyPercent ?? data.leader_efficiency_percent ?? 0,
        leaderSpecialistName: data.leaderSpecialistName ?? data.leader_specialist_name ?? "",
        lowestEfficiencyPercent: data.lowestEfficiencyPercent ?? data.lowest_efficiency_percent ?? 0,
        lowestSpecialistName: data.lowestSpecialistName ?? data.lowest_specialist_name ?? "",

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
        specialistId: item.specialistId || item.specialist_id || "",
        fullName: item.fullName || item.full_name || item.specialistName || item.specialist_name || "—",
        assignedCount: item.assignedCount ?? item.assigned_count ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        activeCount: item.activeCount ?? item.active_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        reworkCount: item.reworkCount ?? item.rework_count ?? 0,
        completionRatePercent: item.completionRatePercent ?? item.completion_rate_percent ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        efficiencyPercent: item.efficiencyPercent ?? item.efficiency_percent ?? 0,
        workloadPercent: item.workloadPercent ?? item.workload_percent ?? 0,
        adjustedCompletionRatePercent: item.adjustedCompletionRatePercent ?? item.adjusted_completion_rate_percent ?? 0,
        adjustedComplaintRatePercent: item.adjustedComplaintRatePercent ?? item.adjusted_complaint_rate_percent ?? 0,
        completionRateDifferencePercent: item.completionRateDifferencePercent ?? item.completion_rate_difference_percent ?? 0,
        complaintRateAdvantagePercent: item.complaintRateAdvantagePercent ?? item.complaint_rate_advantage_percent ?? 0,
        ratingPercent: item.ratingPercent ?? item.rating_percent ?? 0
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
        sharePercent: item.sharePercent ?? item.share_percent ?? 0,
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
        specialistId: item.specialistId || item.specialist_id || "",
        fullName: item.fullName || item.full_name || "—",
        ratingPercent: item.ratingPercent ?? item.rating_percent ?? 0,
        completedCount: item.completedCount ?? item.completed_count ?? 0,
        assignedCount: item.assignedCount ?? item.assigned_count ?? 0,
        complaintsCount: item.complaintsCount ?? item.complaints_count ?? 0,
        sharePercent: item.sharePercent ?? item.share_percent ?? 0,
        completionRatePercent: item.completionRatePercent ?? item.completion_rate_percent ?? 0,
        complaintRatePercent: item.complaintRatePercent ?? item.complaint_rate_percent ?? 0,
        workloadPercent: item.workloadPercent ?? item.workload_percent ?? 0,
        adjustedCompletionRatePercent: item.adjustedCompletionRatePercent ?? item.adjusted_completion_rate_percent ?? 0,
        adjustedComplaintRatePercent: item.adjustedComplaintRatePercent ?? item.adjusted_complaint_rate_percent ?? 0,
        reason: item.reason || "Немає пояснення рекомендації."
    };
}

/* ===================== SUMMARY ===================== */

function getAnalyticsSummaryCard(label, value, options = {}) {
    const className = options.wide ? "analytics-card analytics-card-wide" : "analytics-card";
    const hint = options.hint
        ? `<div class="analytics-card-hint">${escapeHtml(options.hint)}</div>`
        : "";

    return `
        <div class="${className}">
            <div class="analytics-card-label">${escapeHtml(label)}</div>
            <div class="analytics-card-value">${escapeHtml(value)}</div>
            ${hint}
        </div>
    `;
}

function renderAnalyticsSummary(data) {
    const container = document.getElementById("analyticsSummary");
    if (!container) return;

    const specialists = Array.isArray(data.specialists)
        ? data.specialists.map(normalizeSpecialistAnalytics)
        : [];

    const selected = data.isPersonalized
        ? specialists[0] || null
        : null;

    const secondRowCards = selected
        ? [
            getAnalyticsSummaryCard(
                "Рейтинг спеціаліста",
                analyticsPercent(selected.ratingPercent),
                {
                    wide: true,
                    hint: selected.fullName
                }
            ),
            getAnalyticsSummaryCard(
                "% виконання своїх заявок",
                analyticsPercent(selected.completionRatePercent),
                {
                    wide: true,
                    hint: `${analyticsNumber(selected.completedCount)} з ${analyticsNumber(selected.assignedCount)} призначених`
                }
            ),
            getAnalyticsSummaryCard(
                "ВУЗУН",
                analyticsPercent(selected.adjustedCompletionRatePercent),
                {
                    wide: true,
                    hint: "Відносна успішність з урахуванням навантаження"
                }
            ),
            getAnalyticsSummaryCard(
                "Скарги з урахуванням обсягу",
                analyticsPercent(selected.adjustedComplaintRatePercent),
                {
                    wide: true,
                    hint: `${analyticsNumber(selected.complaintsCount)} скарг`
                }
            ),
            getAnalyticsSummaryCard(
                "Виконання vs відділ",
                analyticsSignedPercent(selected.completionRateDifferencePercent),
                {
                    wide: true,
                    hint: "+ означає вище середнього відділу"
                }
            ),
            getAnalyticsSummaryCard(
                "% скарг по заявкам спеца",
                analyticsPercent(selected.complaintRatePercent),
                {
                    wide: true,
                    hint: `${analyticsNumber(selected.complaintsCount)} скарг на ${analyticsNumber(selected.completedCount)} виконані`
                }
            )
        ]
        : [
            getAnalyticsSummaryCard(
                "Середній рейтинг",
                analyticsPercent(data.averageEfficiencyPercent),
                {
                    wide: true,
                    hint: "З урахуванням обсягу, виконання та скарг"
                }
            ),
            getAnalyticsSummaryCard(
                "Найвищий рейтинг",
                analyticsPercent(data.leaderEfficiencyPercent),
                {
                    wide: true,
                    hint: data.leaderSpecialistName || "—"
                }
            ),
            getAnalyticsSummaryCard(
                "Найнижчий рейтинг",
                analyticsPercent(data.lowestEfficiencyPercent),
                {
                    wide: true,
                    hint: data.lowestSpecialistName || "—"
                }
            )
        ];

    container.innerHTML = [
        getAnalyticsSummaryCard("Усього заявок", analyticsNumber(data.totalOrders)),
        getAnalyticsSummaryCard("Виконано", analyticsNumber(data.completedOrders)),
        getAnalyticsSummaryCard("Активні", analyticsNumber(data.activeOrders)),
        getAnalyticsSummaryCard("Скасовано", analyticsNumber(data.canceledOrders)),
        getAnalyticsSummaryCard("Скарги", analyticsNumber(data.complaintsCount)),
        getAnalyticsSummaryCard("Переробки", analyticsNumber(data.reworkCount)),
        ...secondRowCards
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
            { label: "Скасовано", value: analytics.canceledOrders, percent: total > 0 ? analytics.canceledOrders / total * 100 : 0 },
            { label: "Скарги", value: analytics.complaintsCount, percent: total > 0 ? analytics.complaintsCount / total * 100 : 0 },
            { label: "Переробки", value: analytics.reworkCount, percent: total > 0 ? analytics.reworkCount / total * 100 : 0 }
        ],
        "Немає заявок за обраний період"
    );
}

function renderSpecialistShareChart(analytics) {
    const rows = (Array.isArray(analytics.specialists) ? analytics.specialists : [])
        .map(normalizeSpecialistAnalytics)
        .filter(item => Number(item.assignedCount) > 0)
        .sort((a, b) => Number(b.ratingPercent) - Number(a.ratingPercent))
        .slice(0, 5)
        .map(item => ({
            label: item.fullName,
            value: item.completedCount,
            percent: item.ratingPercent
        }));

    renderHorizontalBarChart("chartSpecialistShare", rows, "Немає заявок по спеціалістах");
}

function renderServiceTypesChart(analytics) {
    const total = Number(analytics.totalOrders) || 0;

    const rows = (Array.isArray(analytics.serviceTypes) ? analytics.serviceTypes : [])
        .map(normalizeServiceType)
        .filter(item => Number(item.count) > 0)
        .sort((a, b) => Number(b.count) - Number(a.count))
        .slice(0, 5)
        .map(item => ({
            label: formatServiceType(item.serviceType),
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

function renderAnalyticsCharts(analytics) {
    renderOrdersStatusChart(analytics);
    renderSpecialistShareChart(analytics);
    renderServiceTypesChart(analytics);
    renderLocationsChart(analytics);
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function setAnalyticsPersonalMode(analytics) {
    const isPersonalized = !!analytics.isPersonalized;
    const selectedName = analytics.selectedSpecialistName || "вибраного спеціаліста";

    ["specialistShareChartCard", "specialistContributionNote", "specialistContributionSection"]
        .forEach(id => document.getElementById(id)?.classList.toggle("hidden", isPersonalized));

    setText(
        "bonusRecommendationTitle",
        isPersonalized ? "Статистика вибраного спеціаліста" : "Рекомендація на премію"
    );
    setText(
        "bonusRecommendationSubtitle",
        isPersonalized
            ? `Ключові показники ${selectedName}`
            : "Система пропонує кандидата на основі внеску у виконані заявки, відсотка виконання та скарг від виконаних робіт"
    );

    setText(
        "complainersAnalyticsTitle",
        isPersonalized ? "Хто подає скарги по заявках спеціаліста" : "Хто найчастіше подає скарги"
    );
    setText(
        "complainersAnalyticsSubtitle",
        isPersonalized
            ? `Працівники, які подавали скарги по заявках, призначених спеціалісту ${selectedName}`
            : "Показує частоту скарг працівника відносно його заявок та його частку серед усіх скарг за період"
    );

    setText(
        "serviceTypesAnalyticsTitle",
        isPersonalized ? "Типи звернень спеціаліста" : "Типи звернень"
    );
    setText(
        "serviceTypesAnalyticsSubtitle",
        isPersonalized
            ? `Категорії заявок, які виконував або виконує ${selectedName}`
            : "Які послуги найчастіше замовляють працівники"
    );

    setText(
        "requestersAnalyticsTitle",
        isPersonalized ? "Хто створює заявки для спеціаліста" : "Хто найчастіше подає заявки"
    );
    setText(
        "requestersAnalyticsSubtitle",
        isPersonalized
            ? `Працівники, чиї заявки були призначені спеціалісту ${selectedName}`
            : "Частка показує, який відсоток від усіх заявок за період створив конкретний працівник"
    );

    setText(
        "locationsAnalyticsTitle",
        isPersonalized ? "Проблемні локації спеціаліста" : "Де найчастіше трапляються поломки"
    );
    setText(
        "locationsAnalyticsSubtitle",
        isPersonalized
            ? `Локації заявок, призначених спеціалісту ${selectedName}`
            : "Частка показує, який відсоток від усіх заявок припадає на конкретну локацію"
    );
}

/* ===================== BONUS ===================== */

function renderSelectedSpecialistStats(analytics) {
    const container = document.getElementById("analyticsBonusRecommendation");
    if (!container) return;

    const selected = Array.isArray(analytics.specialists)
        ? analytics.specialists.map(normalizeSpecialistAnalytics)[0]
        : null;
    const bonus = normalizeBonusRecommendation(analytics.bonusRecommendation);
    const isBonusRecommended =
        bonus.hasCandidate &&
        String(bonus.specialistId) === String(selected?.specialistId);
    const isNotTopByRating =
        !bonus.hasCandidate &&
        String(bonus.reason || "").toLowerCase().includes("найвищим рейтингом");
    const bonusStatus = isBonusRecommended
        ? "Рекомендується"
        : isNotTopByRating
            ? "Не рекомендується"
            : "Не рекомендується";

    if (!selected) {
        container.innerHTML = `<div class="empty-box">Немає даних по вибраному спеціалісту за обраний період.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="order-details-grid">
            <div class="order-detail-field">
                <div class="order-detail-label">Спеціаліст</div>
                <div class="order-detail-value">${escapeHtml(selected.fullName)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Рейтинг</div>
                <div class="order-detail-value">${analyticsKpi(selected.ratingPercent)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Премія</div>
                <div class="order-detail-value">${escapeHtml(bonusStatus)}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Призначено</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(selected.assignedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Виконано</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(selected.completedCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Активні</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(selected.activeCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(selected.complaintsCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Переробки</div>
                <div class="order-detail-value">${escapeHtml(analyticsNumber(selected.reworkCount))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Навантаження</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(selected.workloadPercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% виконання своїх заявок</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(selected.completionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">ВУЗУН</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(selected.adjustedCompletionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% скарг по заявкам</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(selected.complaintRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги з урахуванням обсягу</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(selected.adjustedComplaintRatePercent))}</div>
            </div>

            ${!isBonusRecommended ? `
                <div class="order-detail-field full">
                    <div class="order-detail-label">Пояснення</div>
                    <div class="order-detail-value long-text">На премію не рекомендовано</div>
                </div>
            ` : ""}
        </div>
    `;
}

function renderBonusRecommendation(item) {
    const container = document.getElementById("analyticsBonusRecommendation");
    if (!container) return;

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
                <div class="order-detail-label">Навантаження</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.workloadPercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">% виконання своїх заявок</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.completionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">ВУЗУН</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.adjustedCompletionRatePercent))}</div>
            </div>

            <div class="order-detail-field">
                <div class="order-detail-label">Скарги з урахуванням обсягу</div>
                <div class="order-detail-value">${escapeHtml(analyticsPercent(recommendation.adjustedComplaintRatePercent))}</div>
            </div>

            <div class="order-detail-field full">
                <div class="order-detail-label">Пояснення</div>
                <div class="order-detail-value long-text">${escapeHtml(recommendation.reason)}</div>
            </div>
        </div>
    `;
}

/* ===================== TABLE RENDERERS ===================== */

function renderSpecialistsAnalytics(items) {
    const body = document.getElementById("analyticsSpecialists");
    if (!body) return;

    const rows = Array.isArray(items) ? items.map(normalizeSpecialistAnalytics) : [];

    if (rows.length === 0) {
        setTableEmpty(body, 10, "Немає даних по спеціалістах");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.ratingPercent) - Number(a.ratingPercent))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(item.fullName)}</td>
                <td>${escapeHtml(analyticsNumber(item.assignedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.activeCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
                <td>${analyticsKpi(item.ratingPercent)}</td>
                <td>${escapeHtml(analyticsPercent(item.workloadPercent))}</td>
                <td>${escapeHtml(analyticsPercent(item.completionRatePercent))}</td>
                <td>${escapeHtml(analyticsPercent(item.adjustedCompletionRatePercent))}</td>
                <td>${escapeHtml(analyticsPercent(item.adjustedComplaintRatePercent))}</td>
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
        setTableEmpty(body, 5, "Немає даних по типах звернень");
        return;
    }

    body.innerHTML = "";

    rows
        .sort((a, b) => Number(b.count) - Number(a.count))
        .forEach(item => {
            const tr = document.createElement("tr");
            tr.className = "main-row";

            tr.innerHTML = `
                <td>${escapeHtml(formatServiceType(item.serviceType))}</td>
                <td>${escapeHtml(analyticsNumber(item.count))}</td>
                <td>${escapeHtml(analyticsPercent(item.sharePercent))}</td>
                <td>${escapeHtml(analyticsNumber(item.completedCount))}</td>
                <td>${escapeHtml(analyticsNumber(item.complaintsCount))}</td>
            `;

            body.appendChild(tr);
        });
}

/* ===================== MAIN RENDER ===================== */

function renderAnalytics(data) {
    const analytics = normalizeAnalytics(data || {});

    setAnalyticsPersonalMode(analytics);
    renderAnalyticsSummary(analytics);
    renderAnalyticsCharts(analytics);
    if (analytics.isPersonalized) {
        renderSelectedSpecialistStats(analytics);
    } else {
        renderBonusRecommendation(analytics.bonusRecommendation);
    }
    renderSpecialistsAnalytics(analytics.specialists);
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

        const data = await fetchBossAnalytics(
            filters.from,
            filters.to,
            filters.specialistId
        );

        renderAnalytics(data);
        setStatus("Аналітику завантажено");
    } catch (e) {
        console.error(e);

        renderAnalytics({});
        setStatus("Помилка завантаження аналітики: " + e.message, true);
    }
}
