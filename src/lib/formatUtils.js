export const money = n => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const compactNumber = (value, max = 0) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: max, minimumFractionDigits: 0 });

export function formatCompactNumber(value, max = 1) {
  const n = Number(value || 0), abs = Math.abs(n), sign = n < 0 ? '-' : '';
  const clean = v => Number(v.toFixed(max)).toLocaleString('en-US', { maximumFractionDigits: max });
  if (abs >= 1000000) return `${sign}${clean(abs / 1000000)}M`;
  if (abs >= 1000) return `${sign}${clean(abs / 1000)}k`;
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export const compactSigned = (value, max = 0) => `${Number(value || 0) > 0 ? '+' : Number(value || 0) < 0 ? '-' : ''}${formatCompactNumber(Math.abs(Number(value || 0)), max)}`;
export const formatMoneyCompactCard = value => `${Number(value || 0) >= 0 ? '+' : ''}$${formatCompactNumber(Math.abs(Number(value || 0)), 1)}`;
export const formatMoneyClean = value => `${Number(value || 0) < 0 ? '-' : ''}$${formatCompactNumber(Math.abs(Number(value || 0)), 1)}`;
export const formatPercentCard = value => `${compactNumber(Number(value || 0), 0)}%`;
export const formatMetricCard = (value, max = 0) => formatCompactNumber(value, max);
export const formatR = value => `${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: Math.abs(Number(value || 0)) < 10 ? 2 : 1, maximumFractionDigits: 2 })}R`;

export const formatCalendarMoney = value => {
  const n = Number(value || 0);
  if (n === 0) return 'BE';
  return `${n > 0 ? '+' : '-'}$${formatCompactNumber(Math.abs(n), 1)}`;
};

export const formatCalendarR = value => {
  const n = Number(value || 0);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}R`;
};

export const formatCalendarPct = value => {
  const n = Number(value || 0);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

export const pct = n => `${Number(n || 0).toFixed(2)}%`;

export function formatCurrencySafe(value) { return Number.isFinite(Number(value)) ? money(Number(value)) : 'N/A'; }

export function formatRShare(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 'N/A';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}R`;
}

export function formatPercentageSafe(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 'N/A';
  return `${n.toFixed(0)}%`;
}

export function formatRiskPctLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  const fixed = n < 1 ? n.toFixed(2) : n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return `${fixed}%`;
}
