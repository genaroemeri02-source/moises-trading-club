export const today = () => new Date().toISOString().slice(0, 10);
export const dateAddDays = (iso, days) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

export function nyParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  let hour = Number(parts.hour); if (hour === 24) hour = 0;
  return { year: parts.year, month: parts.month, day: parts.day, hour, minute: Number(parts.minute), second: Number(parts.second) };
}

export const nyISO = (d = new Date()) => { const p = nyParts(d); return `${p.year}-${p.month}-${p.day}`; };
export const tradingDayKey = (d = new Date()) => { const p = nyParts(d); const iso = `${p.year}-${p.month}-${p.day}`; return p.hour >= 17 ? dateAddDays(iso, 1) : iso; };
export const formatDateLabel = iso => { try { return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }); } catch { return iso; } };

export function normalizeDateKey(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return normalizeDateKey(value.toDate());
    if (Number.isFinite(Number(value.seconds))) return normalizeDateKey(Number(value.seconds));
    if (Number.isFinite(Number(value._seconds))) return normalizeDateKey(Number(value._seconds));
  }
  if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n > 9999999999 ? n : n * 1000).toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  m = raw.match(/^(\d{2})[-/](\d{2})$/);
  if (m) {
    const year = String(monthKey()).slice(0, 4);
    const mo = Number(m[1]), d = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${year}-${m[1]}-${m[2]}`;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}

export function getTradeOperationalDateKey(trade = {}) {
  const explicit = [trade.date, trade.tradeDate, trade.entryDate, trade.closeDate, trade.sessionDate, trade.tradingDate, trade.operationalDate, trade.dayKey, trade.tradingDay];
  for (const value of explicit) {
    const date = normalizeDateKey(value);
    if (date) return date;
  }
  const fallback = [trade.closedAt, trade.executedAt, trade.timestamp, trade.createdAt, trade.updatedAt];
  for (const value of fallback) {
    const date = normalizeDateKey(value);
    if (date) return date;
  }
  return null;
}

export const monthKey = (d = new Date()) => nyISO(d).slice(0, 7);

export function daysInMonth(key) {
  const [year, month] = String(key || monthKey()).split('-').map(Number);
  if (!year || !month) return [];
  const first = new Date(year, month - 1, 1);
  const total = new Date(year, month, 0).getDate();
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= total; day++) cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function resetCountdown(now = new Date()) {
  const p = nyParts(now);
  const nowSeconds = p.hour * 3600 + p.minute * 60 + p.second;
  const resetSeconds = 17 * 3600;
  let remaining = resetSeconds - nowSeconds;
  if (remaining <= 0) remaining += 24 * 3600;
  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const sec = String(remaining % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export function weekStartISO() { const base = tradingDayKey(); const d = new Date(`${base}T12:00:00`); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.toISOString().slice(0, 10); }

export function safeDate(v) { return typeof v === 'string' ? v : (v?.toDate?.()?.toISOString?.().slice(0, 10) || today()); }
