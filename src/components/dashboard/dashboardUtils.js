import { monthKey } from '../../lib/dateUtils.js';
import { toNumberSafe, isClosedEvaluableTrade, tradeDayKey } from '../../lib/tradeUtils.js';
import { calendarDayR, groupTradesByDay } from '../../lib/analyticsUtils.js';

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

export function sessionNameNY() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }).format(new Date()));
  if (h < 3) return 'Asia / cierre NY';
  if (h < 8) return 'Londres';
  if (h < 13) return 'NY activa';
  if (h < 17) return 'Post NY';
  return 'Rollover / after-hours';
}

export function tradeSortTime(trade, index = 0) {
  const values = [trade?.updatedAt, trade?.createdAt, trade?.closedAt, trade?.dateTime, trade?.time, trade?.date, trade?.tradingDay];
  for (const value of values) {
    if (!value) continue;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (Number.isFinite(Number(value?.seconds))) return Number(value.seconds) * 1000 + Number(value.nanoseconds || 0) / 1000000;
    const parsed = Date.parse(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return index;
}

export function latestTradeFromStats(dayStats) {
  const rows = dayStats?.trades || [];
  if (!rows.length) return null;
  return rows.map((trade, index) => ({ trade, index, time: tradeSortTime(trade, index) })).sort((a, b) => (b.time - a.time) || (b.index - a.index))[0].trade;
}

export function buildDailyNetCurve(trades = []) {
  let running = 0;
  const key = monthKey();
  return Object.values(groupTradesByDay((trades || []).filter(isClosedEvaluableTrade)))
    .filter(day => String(day.date).slice(0, 7) === key)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => {
      running += Number(day.total || 0);
      return { name: String(day.date).slice(5), date: day.date, value: Math.round(running), daily: Math.round(day.total || 0), r: Number(calendarDayR(day) || 0) };
    });
}

function normalizeDashboardSession(value = '') {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('ny') || raw.includes('new york')) return 'NY';
  if (raw.includes('lond') || raw.includes('london')) return 'Londres';
  if (raw.includes('asia')) return 'Asia';
  return value || 'Sin sesión';
}

export function buildOperationalHeatmap(trades = []) {
  const sessions = ['NY', 'Londres', 'Asia'];
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const seed = sessions.reduce((acc, session) => ({ ...acc, [session]: days.map(day => ({ session, day, count: 0, total: 0, r: 0, avgR: 0, tone: 'empty' })) }), {});
  (trades || []).filter(isClosedEvaluableTrade).forEach(t => {
    const d = new Date(`${tradeDayKey(t) || t.date || ''}T12:00:00`);
    const dayIndex = (d.getDay() + 6) % 7;
    if (dayIndex > 4) return;
    const session = normalizeDashboardSession(t.session);
    if (!seed[session]) seed[session] = days.map(day => ({ session, day, count: 0, total: 0, r: 0, avgR: 0, tone: 'empty' }));
    const cell = seed[session][dayIndex];
    const v = toNumberSafe(t.resultMoney);
    const r = toNumberSafe(t.resultR);
    cell.count++;
    cell.total += v;
    cell.r += r;
    cell.avgR = cell.count ? cell.r / cell.count : 0;
    cell.tone = cell.avgR > 0 ? 'positive' : cell.avgR < 0 ? 'negative' : 'neutral';
  });
  return Object.entries(seed).map(([session, cells]) => ({ session, cells }));
}
