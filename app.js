import { computePlan, clampNonNegative } from "./calculator.mjs";

const STORAGE_KEY = "yield-calc-ulw-v2";
const SIM_DAYS_PER_SECOND = 1;

const state = {
  plans: [],
  nowMs: Date.now(),
  chart: null,
  tickerTimer: null
};

const chartColors = ["#2f6df6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const planContainer = document.getElementById("plans");
const addPlanBtn = document.getElementById("addPlanBtn");

const formatMoney = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const defaultPlan = (id, name) => ({
  id,
  name,
  createdAt: Date.now(),
  principal: 10000,
  lockEnabled: false,
  apr: 12,
  apy: 12.75,
  rateSource: "apr",
  years: 1,
  compoundsPerYear: 365
});

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plans));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [defaultPlan(1, "方案 1")];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [defaultPlan(1, "方案 1")];
    }
    return parsed.map((p, index) => {
      const base = defaultPlan(index + 1, `方案 ${index + 1}`);
      return {
        ...base,
        ...p,
        createdAt: Number.isFinite(Number(p.createdAt)) ? Number(p.createdAt) : base.createdAt
      };
    });
  } catch {
    return [defaultPlan(1, "方案 1")];
  }
};

const elapsedDaysForPlan = (plan) => {
  const createdAt = Number.isFinite(Number(plan.createdAt)) ? Number(plan.createdAt) : state.nowMs;
  const elapsedSeconds = Math.max(0, (state.nowMs - createdAt) / 1000);
  return elapsedSeconds * SIM_DAYS_PER_SECOND;
};

const computeForView = (plan) => computePlan(plan, elapsedDaysForPlan(plan));

const parseMoneyText = (text) => {
  const normalized = String(text).replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const animateMoney = (el, target) => {
  if (!(el instanceof HTMLElement)) {
    return;
  }
  const to = Number.isFinite(target) ? target : 0;
  const from = parseMoneyText(el.textContent || "0");
  const delta = to - from;
  if (Math.abs(delta) < 0.005) {
    el.textContent = formatMoney(to);
    return;
  }

  const duration = 700;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = formatMoney(from + delta * eased);
    if (p < 1) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
};

const renderPlans = () => {
  planContainer.innerHTML = "";

  state.plans.forEach((plan) => {
    const result = computeForView(plan);
    const card = document.createElement("article");
    card.className = "plan-card";
    card.dataset.id = String(plan.id);

    card.innerHTML = `
      <div class="plan-head">
        <div class="plan-title">${plan.name}</div>
        <button class="remove-btn" type="button">删除</button>
      </div>
      <div class="grid">
        <div class="field">
          <label>本金</label>
          <input type="number" data-key="principal" min="0" step="0.01" value="${plan.principal}" />
        </div>
        <div class="field">
          <label>是否锁仓</label>
          <select data-key="lockEnabled">
            <option value="false" ${!plan.lockEnabled ? "selected" : ""}>否</option>
            <option value="true" ${plan.lockEnabled ? "selected" : ""}>是</option>
          </select>
        </div>
        <div class="field">
          <label>APR (%)</label>
          <input type="number" data-key="apr" min="0" step="0.01" value="${plan.apr}" />
        </div>
        <div class="field">
          <label>APY (%)</label>
          <input type="number" data-key="apy" min="0" step="0.01" value="${plan.apy}" />
        </div>
        <div class="field">
          <label>计算基准</label>
          <select data-key="rateSource">
            <option value="apr" ${plan.rateSource === "apr" ? "selected" : ""}>按 APR</option>
            <option value="apy" ${plan.rateSource === "apy" ? "selected" : ""}>按 APY</option>
          </select>
        </div>
        <div class="field">
          <label>周期(年)</label>
          <input type="number" data-key="years" min="0" step="0.1" value="${plan.years}" />
        </div>
      </div>

      <div class="stats">
        <div class="stat-row"><span>收益</span><strong class="money-value" data-kind="profit" data-plan-id="${plan.id}">${formatMoney(result.grossProfit)}</strong></div>
        <div class="stat-row"><span>最终资产</span><strong class="money-value" data-kind="final" data-plan-id="${plan.id}">${formatMoney(result.finalAmount)}</strong></div>
        <div class="stat-row"><span>实时资产(每秒跳动)</span><strong class="money-value pulse" data-kind="tick" data-plan-id="${plan.id}">${formatMoney(result.tickingAmount)}</strong></div>
        <div class="muted">${plan.lockEnabled ? "锁仓中（仅标记，不影响收益公式）" : "未锁仓"} ｜ 等效 APY：${result.apyPercent.toFixed(2)}%</div>
      </div>
    `;

    const removeBtn = card.querySelector(".remove-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        state.plans = state.plans.filter((item) => item.id !== plan.id);
        if (state.plans.length === 0) {
          state.plans = [defaultPlan(1, "方案 1")];
        }
        saveState();
        renderAll();
      });
    }

    const fields = card.querySelectorAll("input, select");
    fields.forEach((field) => {
      field.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
          return;
        }

        const key = target.dataset.key;
        if (!key) {
          return;
        }

        if (key === "lockEnabled") {
          plan.lockEnabled = target.value === "true";
        } else if (key === "rateSource") {
          plan.rateSource = target.value === "apy" ? "apy" : "apr";
        } else {
          plan[key] = clampNonNegative(toNumber(target.value));
        }

        saveState();
        renderAll();
      });
    });

    planContainer.appendChild(card);
  });
};

const updateTickingOnly = () => {
  state.plans.forEach((plan) => {
    const result = computeForView(plan);
    const tickEl = document.querySelector(`.money-value[data-kind="tick"][data-plan-id="${plan.id}"]`);
    animateMoney(tickEl, result.tickingAmount);
  });
};

const renderChart = () => {
  const canvas = document.getElementById("compoundChart");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const results = state.plans.map((plan) => ({ plan, result: computeForView(plan) }));
  const labels = results[0]?.result.labels ?? [];
  const datasets = results.map(({ plan, result }, idx) => ({
    label: plan.name,
    data: result.points,
    borderColor: chartColors[idx % chartColors.length],
    backgroundColor: "transparent",
    borderWidth: 2,
    tension: 0.2
  }));

  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update();
    return;
  }

  state.chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          ticks: {
            callback: (value) => `¥${formatMoney(Number(value))}`
          }
        }
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ¥${formatMoney(context.parsed.y)}`
          }
        }
      }
    }
  });
};

const renderAll = () => {
  renderPlans();
  renderChart();
};

const addPlan = () => {
  const nextId = state.plans.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  state.plans.push(defaultPlan(nextId, `方案 ${state.plans.length + 1}`));
  saveState();
  renderAll();
};

const init = () => {
  state.plans = loadState();
  state.nowMs = Date.now();

  addPlanBtn.addEventListener("click", addPlan);
  renderAll();

  state.tickerTimer = setInterval(() => {
    state.nowMs = Date.now();
    updateTickingOnly();
  }, 1000);
};

init();
