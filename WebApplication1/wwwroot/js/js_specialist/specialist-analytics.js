function specialistAnalyticsFormatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "0%";
}

function specialistAnalyticsFormatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "0";
}

function specialistAnalyticsGetTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function specialistAnalyticsGetMonthStartInputValue() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function initSpecialistAnalyticsFilters() {
  const fromInput = document.getElementById("specialistAnalyticsFrom");
  const toInput = document.getElementById("specialistAnalyticsTo");

  if (fromInput && !fromInput.value) {
    fromInput.value = specialistAnalyticsGetMonthStartInputValue();
  }

  if (toInput && !toInput.value) {
    toInput.value = specialistAnalyticsGetTodayInputValue();
  }
}

function resetSpecialistAnalyticsFilters() {
  const fromInput = document.getElementById("specialistAnalyticsFrom");
  const toInput = document.getElementById("specialistAnalyticsTo");

  if (fromInput) fromInput.value = specialistAnalyticsGetMonthStartInputValue();
  if (toInput) toInput.value = specialistAnalyticsGetTodayInputValue();

  loadSpecialistAnalytics();
}

function setSpecialistAnalyticsStatus(text, isError = false) {
  const el = document.getElementById("specialistAnalyticsStatus");
  if (!el) return;

  el.textContent = text || "";
  el.className = isError
    ? "specialist-analytics-status error"
    : "specialist-analytics-status";
}

function getSpecialistAnalyticsFilters() {
  return {
    from: document.getElementById("specialistAnalyticsFrom")?.value || "",
    to: document.getElementById("specialistAnalyticsTo")?.value || ""
  };
}

function normalizeSpecialistAnalyticsSummary(item) {
  item = item || {};

  return {
    totalOrders: item.totalOrders ?? 0,
    completedOrders: item.completedOrders ?? 0,
    activeOrders: item.activeOrders ?? 0,
    complaintsCount: item.complaintsCount ?? 0,
    reworkCount: item.reworkCount ?? 0,
    completionRatePercent: item.completionRatePercent ?? 0,
    complaintRatePercent: item.complaintRatePercent ?? 0,
    reworkRatePercent: item.reworkRatePercent ?? 0
  };
}

function normalizeSpecialistComparison(item) {
  item = item || {};

  return {
    personalCompletedSharePercent: item.personalCompletedSharePercent ?? 0,
    personalOrdersSharePercent: item.personalOrdersSharePercent ?? 0,
    completionRateDifferencePercent: item.completionRateDifferencePercent ?? 0,
    complaintRateDifferencePercent: item.complaintRateDifferencePercent ?? 0,
    departmentSpecialistsCount: item.departmentSpecialistsCount ?? 0,
    departmentSpecialistsWithOrdersCount: item.departmentSpecialistsWithOrdersCount ?? 0,
    averageOrdersPerSpecialist: item.averageOrdersPerSpecialist ?? 0,
    averageCompletedPerSpecialist: item.averageCompletedPerSpecialist ?? 0
  };
}

function normalizeStatusItem(item) {
  item = item || {};

  return {
    status: item.status || "—",
    count: item.count ?? 0,
    sharePercent: item.sharePercent ?? 0
  };
}

function normalizeWorkerActivity(item) {
  if (!item) return null;

  return {
    fullName: item.fullName || "Немає даних",
    ordersCount: item.ordersCount ?? 0,
    completedCount: item.completedCount ?? 0,
    activeCount: item.activeCount ?? 0,
    complaintsCount: item.complaintsCount ?? 0,
    ordersSharePercent: item.ordersSharePercent ?? 0,
    complaintRatePercent: item.complaintRatePercent ?? 0,
    complaintSharePercent: item.complaintSharePercent ?? 0
  };
}

function normalizeSpecialistAnalytics(data) {
  data = data || {};

  return {
    personal: normalizeSpecialistAnalyticsSummary(data.personal),
    department: normalizeSpecialistAnalyticsSummary(data.department),
    comparison: normalizeSpecialistComparison(data.comparison),

    personalStatuses: Array.isArray(data.personalStatuses) ? data.personalStatuses : [],
    departmentStatuses: Array.isArray(data.departmentStatuses) ? data.departmentStatuses : [],

    personalTopRequester: normalizeWorkerActivity(data.personalTopRequester),
    personalTopComplainer: normalizeWorkerActivity(data.personalTopComplainer),
    departmentTopRequester: normalizeWorkerActivity(data.departmentTopRequester),
    departmentTopComplainer: normalizeWorkerActivity(data.departmentTopComplainer)
  };
}

function getSpecialistAnalyticsCard(label, value, hint = "") {
  return `
    <div class="specialist-analytics-card">
      <div class="specialist-analytics-card-label">${escapeHtml(label)}</div>
      <div class="specialist-analytics-card-value">${escapeHtml(value)}</div>
      ${hint ? `<div class="specialist-analytics-card-hint">${escapeHtml(hint)}</div>` : ""}
    </div>
  `;
}

function renderSpecialistAnalyticsSummary(containerId, summary) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = [
    getSpecialistAnalyticsCard("Усього", specialistAnalyticsFormatNumber(summary.totalOrders), "заявок за період"),
    getSpecialistAnalyticsCard("Виконано", specialistAnalyticsFormatNumber(summary.completedOrders), specialistAnalyticsFormatPercent(summary.completionRatePercent)),
    getSpecialistAnalyticsCard("Активні", specialistAnalyticsFormatNumber(summary.activeOrders), "ще в роботі"),
    getSpecialistAnalyticsCard("Скарги", specialistAnalyticsFormatNumber(summary.complaintsCount), specialistAnalyticsFormatPercent(summary.complaintRatePercent)),
    getSpecialistAnalyticsCard("Переробки", specialistAnalyticsFormatNumber(summary.reworkCount), specialistAnalyticsFormatPercent(summary.reworkRatePercent))
  ].join("");
}

function specialistAnalyticsSignedPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number === 0) {
    return "0.0%";
  }

  return `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
}

function specialistAnalyticsCompareClass(value, inverse = false) {
  const number = Number(value);

  if (!Number.isFinite(number) || number === 0) {
    return "neutral";
  }

  const good = inverse ? number < 0 : number > 0;
  return good ? "good" : "bad";
}

function renderSpecialistAnalyticsComparison(comparison) {
  const container = document.getElementById("specialistAnalyticsComparison");
  if (!container) return;

  container.innerHTML = `
    <div class="specialist-comparison-card">
      <div class="specialist-comparison-label">Моя частка у виконаних заявках відділу</div>
      <div class="specialist-comparison-value">${escapeHtml(specialistAnalyticsFormatPercent(comparison.personalCompletedSharePercent))}</div>
    </div>

    <div class="specialist-comparison-card">
      <div class="specialist-comparison-label">Моя частка від усіх заявок відділу</div>
      <div class="specialist-comparison-value">${escapeHtml(specialistAnalyticsFormatPercent(comparison.personalOrdersSharePercent))}</div>
    </div>

    <div class="specialist-comparison-card">
      <div class="specialist-comparison-label">Різниця % виконання з відділом</div>
      <div class="specialist-comparison-value ${specialistAnalyticsCompareClass(comparison.completionRateDifferencePercent)}">
        ${escapeHtml(specialistAnalyticsSignedPercent(comparison.completionRateDifferencePercent))}
      </div>
    </div>

    <div class="specialist-comparison-card">
      <div class="specialist-comparison-label">Різниця % скарг з відділом</div>
      <div class="specialist-comparison-value ${specialistAnalyticsCompareClass(comparison.complaintRateDifferencePercent, true)}">
        ${escapeHtml(specialistAnalyticsSignedPercent(comparison.complaintRateDifferencePercent))}
      </div>
    </div>
  `;
}

function clampSpecialistAnalyticsPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 100) return 100;

  return number;
}

function renderSpecialistHorizontalBarChart(containerId, items, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = (Array.isArray(items) ? items : [])
    .map(normalizeStatusItem)
    .filter(item => Number(item.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count));

  if (rows.length === 0) {
    container.innerHTML = `<div class="specialist-chart-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  container.innerHTML = rows.map(item => {
    const label = typeof formatStatus === "function"
      ? formatStatus(item.status)
      : item.status;

    const percent = clampSpecialistAnalyticsPercent(item.sharePercent);

    return `
      <div class="specialist-chart-row">
        <div class="specialist-chart-label">${escapeHtml(label)}</div>

        <div class="specialist-chart-track">
          <div class="specialist-chart-fill" style="width: ${percent}%"></div>
        </div>

        <div class="specialist-chart-value">
          ${escapeHtml(specialistAnalyticsFormatNumber(item.count))} · ${escapeHtml(specialistAnalyticsFormatPercent(percent))}
        </div>
      </div>
    `;
  }).join("");
}

function renderSpecialistAnalyticsCharts(analytics) {
  renderSpecialistHorizontalBarChart(
    "chartPersonalStatus",
    analytics.personalStatuses,
    "Немає моїх заявок за обраний період"
  );

  renderSpecialistHorizontalBarChart(
    "chartDepartmentStatus",
    analytics.departmentStatuses,
    "Немає заявок відділу за обраний період"
  );
}

function getWorkerActivityCard(title, item, emptyText, mode) {
  if (!item) {
    return `
      <div class="specialist-worker-activity-card">
        <div class="specialist-worker-activity-title">${escapeHtml(title)}</div>
        <div class="specialist-worker-activity-empty">${escapeHtml(emptyText)}</div>
      </div>
    `;
  }

  const mainPercent = mode === "complaints"
    ? item.complaintSharePercent
    : item.ordersSharePercent;

  const mainLabel = mode === "complaints"
    ? "частка від усіх скарг"
    : "частка від усіх заявок";

  return `
    <div class="specialist-worker-activity-card">
      <div class="specialist-worker-activity-title">${escapeHtml(title)}</div>
      <div class="specialist-worker-activity-name">${escapeHtml(item.fullName)}</div>

      <div class="specialist-worker-activity-stats">
        <div><span>Заявки</span><strong>${escapeHtml(specialistAnalyticsFormatNumber(item.ordersCount))}</strong></div>
        <div><span>Виконано</span><strong>${escapeHtml(specialistAnalyticsFormatNumber(item.completedCount))}</strong></div>
        <div><span>Активні</span><strong>${escapeHtml(specialistAnalyticsFormatNumber(item.activeCount))}</strong></div>
        <div><span>Скарги</span><strong>${escapeHtml(specialistAnalyticsFormatNumber(item.complaintsCount))}</strong></div>
      </div>

      <div class="specialist-worker-activity-footer">
        <span>${escapeHtml(mainLabel)}</span>
        <strong>${escapeHtml(specialistAnalyticsFormatPercent(mainPercent))}</strong>
      </div>

      <div class="specialist-worker-activity-footer muted">
        <span>% скарг по заявках працівника</span>
        <strong>${escapeHtml(specialistAnalyticsFormatPercent(item.complaintRatePercent))}</strong>
      </div>
    </div>
  `;
}

function renderSpecialistWorkerActivity(analytics) {
  const container = document.getElementById("specialistWorkerActivity");
  if (!container) return;

  container.innerHTML = [
    getWorkerActivityCard(
      "Мій найактивніший заявник",
      analytics.personalTopRequester,
      "За обраний період немає заявок, призначених цьому спеціалісту.",
      "orders"
    ),

    getWorkerActivityCard(
      "Мій найчастіший скаржник",
      analytics.personalTopComplainer,
      "За обраний період немає скарг по моїх заявках.",
      "complaints"
    ),

    getWorkerActivityCard(
      "Найактивніший заявник відділу",
      analytics.departmentTopRequester,
      "За обраний період у відділі немає заявок.",
      "orders"
    ),

    getWorkerActivityCard(
      "Найчастіший скаржник відділу",
      analytics.departmentTopComplainer,
      "За обраний період у відділі немає скарг.",
      "complaints"
    )
  ].join("");
}

function renderSpecialistAnalytics(data) {
  const analytics = normalizeSpecialistAnalytics(data);

  renderSpecialistAnalyticsSummary("specialistPersonalSummary", analytics.personal);
  renderSpecialistAnalyticsSummary("specialistDepartmentSummary", analytics.department);
  renderSpecialistAnalyticsComparison(analytics.comparison);
  renderSpecialistAnalyticsCharts(analytics);
  renderSpecialistWorkerActivity(analytics);
}

async function loadSpecialistAnalytics() {
  const block = document.getElementById("specialistAnalyticsBlock");
  if (!block) return;

  try {
    setSpecialistAnalyticsStatus("Завантаження аналітики...");

    const filters = getSpecialistAnalyticsFilters();

    const data = await fetchSpecialistAnalytics(filters.from, filters.to);

    renderSpecialistAnalytics(data);
    setSpecialistAnalyticsStatus("Аналітику завантажено");
  }
  catch (e) {
    console.error(e);

    renderSpecialistAnalytics({});
    setSpecialistAnalyticsStatus("Помилка завантаження аналітики: " + e.message, true);
  }
}