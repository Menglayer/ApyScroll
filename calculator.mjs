export const clampNonNegative = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return num;
};

export const aprToApyPercent = (aprDecimal, compoundsPerYear) => {
  const n = Math.max(1, Math.floor(clampNonNegative(compoundsPerYear)));
  return (Math.pow(1 + aprDecimal / n, n) - 1) * 100;
};

export const apyPercentToAprDecimal = (apyPercent, compoundsPerYear) => {
  const n = Math.max(1, Math.floor(clampNonNegative(compoundsPerYear)));
  const apyDecimal = clampNonNegative(apyPercent) / 100;
  return n * (Math.pow(1 + apyDecimal, 1 / n) - 1);
};

export const getEffectiveAprDecimal = (plan) => {
  const n = Math.max(1, Math.floor(clampNonNegative(plan.compoundsPerYear)));
  const aprPercent = clampNonNegative(plan.apr);
  const apyPercent = clampNonNegative(plan.apy);

  if (plan.rateSource === "apy") {
    return apyPercentToAprDecimal(apyPercent, n);
  }
  return aprPercent / 100;
};

export const computePlan = (plan, elapsedDays) => {
  const principal = clampNonNegative(plan.principal);
  const years = clampNonNegative(plan.years);
  const n = Math.max(1, Math.floor(clampNonNegative(plan.compoundsPerYear)));
  const aprDecimal = getEffectiveAprDecimal(plan);
  const finalAmount = principal * Math.pow(1 + aprDecimal / n, n * years);
  const grossProfit = finalAmount - principal;

  const lockEnabled = Boolean(plan.lockEnabled);
  const totalDurationDays = years * 365;
  const boundedElapsedDays = Math.min(clampNonNegative(elapsedDays), totalDurationDays);
  const elapsedYears = boundedElapsedDays / 365;

  const tickingAmount = principal * Math.pow(1 + aprDecimal / n, n * elapsedYears);

  const pointsCount = 61;
  const labels = [];
  const points = [];
  for (let i = 0; i < pointsCount; i += 1) {
    const tYear = years * (i / (pointsCount - 1));
    labels.push(`${Math.round(tYear * 365)}天`);
    points.push(principal * Math.pow(1 + aprDecimal / n, n * tYear));
  }

  return {
    principal,
    finalAmount,
    grossProfit,
    tickingAmount,
    isLocked: lockEnabled,
    apyPercent: aprToApyPercent(aprDecimal, n),
    labels,
    points
  };
};
