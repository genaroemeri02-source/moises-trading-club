import { normalizeDateKey, getTradeOperationalDateKey, tradingDayKey } from './dateUtils.js';

export function toNumberSafe(v) {
  if (v === '' || v === '-' || v == null) return 0;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeNumInput(v) {
  const raw = String(v ?? '').replace(',', '.').trim();
  if (raw === '' || raw === '-' || /^-?\d*(\.\d*)?$/.test(raw)) return raw;
  return null;
}

export function parseLimitMoney(v) {
  const raw = String(v || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function normalizeStringArray(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(x => String(x ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.startsWith('[')) { try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map(x => String(x ?? '').trim()).filter(Boolean); } catch {} }
    return raw.split(/[|,;\n\r]+/).map(x => x.trim()).filter(Boolean);
  }
  return [];
}

export function safeArray(value) {
  return Array.isArray(value) ? value.map(x => String(x ?? '').trim()).filter(Boolean) : normalizeStringArray(value);
}

export const TRADE_ARRAY_FIELDS = ['executionBehaviors', 'checklist', 'confluencesUsed', 'confluences', 'tags', 'mistakes', 'confirmations', 'emotions', 'checklistItems', 'screenshots'];

export function normalizeTradeArrayFields(trade = {}) {
  const out = { ...trade };
  TRADE_ARRAY_FIELDS.forEach(key => {
    if (out[key] != null && out[key] !== '') out[key] = safeArray(out[key]);
    else if (key in out) out[key] = [];
  });
  if (!safeArray(out.confluencesUsed).length && safeArray(out.confluences).length) out.confluencesUsed = safeArray(out.confluences);
  if ('confluences' in out) delete out.confluences;
  return out;
}

export function parsePipeList(value) { return normalizeStringArray(value); }

export function normalizeImportSide(value) {
  const side = String(value || '').trim().toUpperCase();
  if (side === 'LONG' || side === 'BUY') return 'BUY';
  if (side === 'SHORT' || side === 'SELL') return 'SELL';
  return side || 'BUY';
}

export function normalizeImportedTradeRow(row = {}, userId = '') {
  const opDate = normalizeDateKey(row.tradingDay || row.date || row.trading_date) || tradingDayKey();
  const asset = String(row.asset || row.symbol || '').trim().toUpperCase();
  const side = normalizeImportSide(row.side || row.direction);
  const resultMoney = toNumberSafe(row.resultMoney ?? row.profitLossMoney ?? row.pl ?? row.pnl);
  const resultR = toNumberSafe(row.resultR ?? row.r);
  const resultPct = toNumberSafe(row.resultPct ?? row.result_pct);
  const { id: importedId, ...rest } = row;
  return normalizeTradeArrayFields({
    ...rest,
    userId: row.userId || userId,
    asset,
    side,
    date: opDate,
    tradingDay: opDate,
    entry: row.entry ?? '',
    sl: row.sl ?? row.stopLoss ?? '',
    tp: row.tp ?? row.takeProfit ?? '',
    exit: row.exit ?? '',
    resultMoney,
    resultR,
    resultPct,
    riskMoney: toNumberSafe(row.riskMoney),
    riskPct: toNumberSafe(row.riskPct),
    tradeSystem: row.tradeSystem || row.system || 'Sistema de Moisés',
    system: row.tradeSystem || row.system || 'Sistema de Moisés',
    setup: row.setup || '',
    pattern: row.pattern || '',
    quality: row.quality || '',
    result: row.result || '',
    lesson: row.lesson || row.notes || '',
    checklist: row.checklist,
    confluencesUsed: row.confluencesUsed,
    confluences: row.confluences,
    executionBehaviors: row.executionBehaviors,
    tags: row.tags,
    mistakes: row.mistakes,
    confirmations: row.confirmations,
    emotions: row.emotions,
    checklistItems: row.checklistItems,
    screenshots: row.screenshots,
    followedPlan: row.followedPlan === true || String(row.followedPlan).toLowerCase() === 'true',
    account: row.account || 'Cuenta principal',
    session: row.session || 'NY'
  });
}

export function parseCsv(text, userId) {
  const trimmed = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];
  const [h, ...lines] = trimmed.split(/\r?\n/);
  if (!h) return [];
  const headers = h.split(',').map(x => x.replaceAll('"', '').trim());
  return lines.filter(Boolean).map(line => {
    const cells = line.match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g) || [];
    const o = { userId, checklist: [] };
    headers.forEach((k, i) => o[k] = (cells[i] || '').replace(/^"|"$/g, '').replaceAll('""', '"'));
    ['entry', 'sl', 'tp', 'exit', 'riskMoney', 'riskPct', 'resultMoney', 'resultPct', 'resultR', 'profitLossMoney'].forEach(k => {
      const raw = o[k];
      if (raw === '' || raw == null || raw === undefined) return;
      const n = Number(String(raw).replace(',', '.'));
      if (Number.isFinite(n)) o[k] = n;
    });
    o.followedPlan = String(o.followedPlan).toLowerCase() === 'true';
    return normalizeImportedTradeRow(o, userId);
  });
}

export function normalizeTradeSetup(trade) {
  const raw = String(trade?.setup || trade?.tradeSystem || trade?.system || trade?.strategy || '').trim();
  if (
    trade?.createdFromChecklist === true ||
    raw.includes('LUZ VERDE') ||
    raw.includes('LUZ ROJA') ||
    raw.includes('PODÉS EJECUTAR') ||
    raw.includes('NO DEBÉS EJECUTAR') ||
    raw.includes('Checklist de Moisés') ||
    raw.includes('Creado desde Checklist')
  ) {
    return 'Sistema de Moisés';
  }
  if (raw === 'Sistema de Moisés' || raw === 'Otro') return raw;
  return raw || 'Otro';
}

export function tradeDayKey(t = {}) {
  return getTradeOperationalDateKey(t) || '';
}

export function isClosedEvaluableTrade(t = {}) {
  const result = String(t.result || t.status || '').trim().toLowerCase();
  if (['invalidada', 'no ejecutada', 'cancelada', 'pending', 'pendiente'].includes(result)) return false;
  return String(t.resultMoney ?? '').trim() !== '' || String(t.resultR ?? '').trim() !== '' || String(t.resultPct ?? '').trim() !== '';
}

export function normalizedText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function accountName(t) { return String(t?.account || t?.accountName || t?.challenge || 'Cuenta principal').trim() || 'Cuenta principal'; }
