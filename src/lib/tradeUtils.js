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

/** Canonical header aliases for CSV import (EN + ES). */
const CSV_HEADER_ALIASES = Object.freeze({
  date: ['date', 'fecha', 'tradingday', 'trading_day', 'trading_date', 'opendate', 'closedate', 'closetime', 'opentime', 'time', 'dia'],
  asset: ['asset', 'symbol', 'activo', 'instrument', 'instrumento', 'ticker', 'par'],
  side: ['side', 'direction', 'direccion', 'dirección', 'tipo'],
  resultMoney: ['resultmoney', 'profitlossmoney', 'pnl', 'pl', 'profit', 'netpnl', 'resultado', 'result', 'ganancia', 'perdida', 'pérdida'],
  resultR: ['resultr', 'r', 'rmultiple', 'rr', 'r_multiple', 'resultado_r'],
  resultPct: ['resultpct', 'result_pct', 'pct', 'porcentaje'],
  setup: ['setup', 'estrategia', 'strategy', 'patron', 'patrón', 'pattern'],
  session: ['session', 'sesion', 'sesión'],
  account: ['account', 'cuenta', 'challenge'],
  notes: ['notes', 'notas', 'lesson', 'comentario', 'comments'],
  entry: ['entry', 'entrada'],
  sl: ['sl', 'stoploss', 'stop'],
  tp: ['tp', 'takeprofit', 'target'],
  exit: ['exit', 'salida']
});

export const CSV_SKIP_REASONS = Object.freeze({
  'empty-row': 'fila vacía',
  'missing-date': 'fecha faltante',
  'invalid-date': 'fecha inválida',
  'missing-pnl': 'falta P/L o R interpretable',
  'invalid-pnl': 'P/L o R inválido',
  'missing-required-fields': 'faltan campos requeridos',
  'duplicate-trade': 'trade duplicado',
  'unsupported-format': 'formato no soportado'
});

function normalizeHeaderKey(key = '') {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '');
}

function resolveCsvHeader(rawHeader) {
  const key = normalizeHeaderKey(rawHeader);
  if (!key) return null;
  for (const [canonical, aliases] of Object.entries(CSV_HEADER_ALIASES)) {
    if (aliases.includes(key) || key === canonical) return canonical;
  }
  if (['userid', 'quality', 'tradesystem', 'system', 'riskmoney', 'riskpct', 'followedplan'].includes(key)) {
    return key;
  }
  return key;
}

/** Parse money / R strings: 100 · 100,50 · $100 · -$100 · 1.5R · -1R */
export function parseImportNumber(value) {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let raw = String(value).trim();
  if (!raw) return null;
  raw = raw.replace(/[$€£%\s]/g, '').replace(/r$/i, '').trim();
  if (!raw || raw === '-' || raw === '+') return null;
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(raw)) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(raw)) {
    raw = raw.replace(/,/g, '');
  } else if (raw.includes(',') && !raw.includes('.')) {
    raw = raw.replace(',', '.');
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function pickRawDate(row = {}) {
  return row.date ?? row.fecha ?? row.tradingDay ?? row.trading_day ?? row.trading_date
    ?? row.openTime ?? row.closeTime ?? row.time ?? row.dia ?? null;
}

function pickRawPnl(row = {}) {
  return row.resultMoney ?? row.pnl ?? row.pl ?? row.profit ?? row.netPnl
    ?? row.resultado ?? row.result ?? row.profitLossMoney ?? null;
}

function pickRawR(row = {}) {
  return row.resultR ?? row.r ?? row.rMultiple ?? row.rr ?? row.R ?? null;
}

function isBlankImportRow(row = {}) {
  return Object.entries(row).every(([k, v]) => {
    if (String(k).startsWith('__')) return true;
    return v == null || String(v).trim() === '';
  });
}

/**
 * Normalize one imported trade row.
 * @param {object} row
 * @param {string} userId
 * @param {{ account?: string, requireDate?: boolean }} [options]
 */
export function normalizeImportedTradeRow(row = {}, userId = '', options = {}) {
  const accountFallback = options.account || 'Cuenta principal';
  const rawDate = pickRawDate(row);
  const hasExplicitDate = rawDate != null && String(rawDate).trim() !== '';
  const opDate = hasExplicitDate ? normalizeDateKey(rawDate) : null;
  const assetRaw = String(row.asset || row.symbol || row.activo || row.instrument || '').trim();
  const asset = assetRaw ? assetRaw.toUpperCase() : 'SIN ACTIVO';
  const side = normalizeImportSide(row.side || row.direction || row.direccion);
  const moneyParsed = parseImportNumber(pickRawPnl(row));
  const rParsed = parseImportNumber(pickRawR(row));
  const pctParsed = parseImportNumber(row.resultPct ?? row.result_pct ?? row.pct);
  const resultMoney = moneyParsed == null ? 0 : moneyParsed;
  const resultR = rParsed == null ? 0 : rParsed;
  const resultPct = pctParsed == null ? 0 : pctParsed;
  const { id: _importedId, ...rest } = row;
  const dateKey = opDate || (options.requireDate === false ? tradingDayKey() : '');

  const cleaned = { ...rest };
  Object.keys(cleaned).forEach((k) => {
    if (String(k).startsWith('__')) delete cleaned[k];
  });

  return normalizeTradeArrayFields({
    ...cleaned,
    userId: row.userId || userId,
    asset,
    side,
    date: dateKey || '',
    tradingDay: dateKey || '',
    entry: row.entry ?? '',
    sl: row.sl ?? row.stopLoss ?? '',
    tp: row.tp ?? row.takeProfit ?? '',
    exit: row.exit ?? '',
    resultMoney,
    resultR,
    resultPct,
    riskMoney: parseImportNumber(row.riskMoney) ?? toNumberSafe(row.riskMoney),
    riskPct: parseImportNumber(row.riskPct) ?? toNumberSafe(row.riskPct),
    tradeSystem: row.tradeSystem || row.system || 'Sistema de Moisés',
    system: row.tradeSystem || row.system || 'Sistema de Moisés',
    setup: row.setup || row.estrategia || row.strategy || row.pattern || 'Importado',
    pattern: row.pattern || '',
    quality: row.quality || '',
    result: typeof row.result === 'string' && !/^-?\d/.test(String(row.result).trim()) ? row.result : '',
    lesson: row.lesson || row.notes || row.notas || '',
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
    account: row.account || row.cuenta || accountFallback,
    session: row.session || row.sesion || row.sesión || 'Sin sesión'
  });
}

/**
 * Validate + normalize a CSV row. Returns trade or skip descriptor.
 */
export function evaluateImportedTradeRow(row = {}, userId = '', options = {}) {
  const rowNumber = Number(options.rowNumber) || 0;
  const rawRow = { ...row };
  Object.keys(rawRow).forEach((k) => {
    if (String(k).startsWith('__')) delete rawRow[k];
  });

  if (isBlankImportRow(row)) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'empty-row',
        reason: CSV_SKIP_REASONS['empty-row'],
        rawRow,
        normalizedPreview: null
      }
    };
  }

  const rawDate = pickRawDate(row);
  if (rawDate == null || String(rawDate).trim() === '') {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'missing-date',
        reason: CSV_SKIP_REASONS['missing-date'],
        rawRow,
        normalizedPreview: null
      }
    };
  }

  const opDate = normalizeDateKey(rawDate);
  if (!opDate) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'invalid-date',
        reason: `${CSV_SKIP_REASONS['invalid-date']} (${String(rawDate).slice(0, 32)})`,
        rawRow,
        normalizedPreview: null
      }
    };
  }

  const rawPnl = pickRawPnl(row);
  const rawR = pickRawR(row);
  const hasPnlField = rawPnl != null && String(rawPnl).trim() !== '';
  const hasRField = rawR != null && String(rawR).trim() !== '';
  if (!hasPnlField && !hasRField) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'missing-pnl',
        reason: CSV_SKIP_REASONS['missing-pnl'],
        rawRow,
        normalizedPreview: null
      }
    };
  }

  const moneyParsed = hasPnlField ? parseImportNumber(rawPnl) : null;
  const rParsed = hasRField ? parseImportNumber(rawR) : null;
  if (hasPnlField && moneyParsed == null && !hasRField) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'invalid-pnl',
        reason: CSV_SKIP_REASONS['invalid-pnl'],
        rawRow,
        normalizedPreview: null
      }
    };
  }
  if (hasRField && rParsed == null && !hasPnlField) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'invalid-pnl',
        reason: CSV_SKIP_REASONS['invalid-pnl'],
        rawRow,
        normalizedPreview: null
      }
    };
  }
  if (hasPnlField && moneyParsed == null && hasRField && rParsed == null) {
    return {
      ok: false,
      skipped: {
        rowNumber,
        reasonCode: 'invalid-pnl',
        reason: CSV_SKIP_REASONS['invalid-pnl'],
        rawRow,
        normalizedPreview: null
      }
    };
  }

  const trade = normalizeImportedTradeRow(row, userId, {
    account: options.account,
    requireDate: true
  });
  trade.date = opDate;
  trade.tradingDay = opDate;
  if (moneyParsed != null) trade.resultMoney = moneyParsed;
  if (rParsed != null) trade.resultR = rParsed;

  return { ok: true, trade, skipped: null };
}

function splitCsvLine(line, delimiter = ',') {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function detectCsvDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

/**
 * Parse CSV text into raw row objects with aliased canonical keys.
 * Does NOT skip/validate — use buildCsvImportResult for that.
 */
export function parseCsv(text, userId) {
  const trimmed = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter((l) => String(l).trim());
  if (!lines.length) return [];
  const delimiter = detectCsvDelimiter(lines[0]);
  const rawHeaders = splitCsvLine(lines[0], delimiter).map((h) => h.replace(/^"|"$/g, '').trim());
  const headers = rawHeaders.map(resolveCsvHeader);
  const knownCanonical = new Set(Object.keys(CSV_HEADER_ALIASES));
  const hasAnyKnown = headers.some((h) => knownCanonical.has(h));
  if (!hasAnyKnown) {
    return lines.slice(1).map((line, idx) => ({
      __rowNumber: idx + 1,
      __unsupported: true,
      __rawLine: line,
      userId
    }));
  }

  return lines.slice(1).map((line, idx) => {
    const cells = splitCsvLine(line, delimiter).map((c) => c.replace(/^"|"$/g, '').replaceAll('""', '"'));
    const o = { userId, checklist: [], __rowNumber: idx + 1 };
    headers.forEach((k, i) => {
      if (!k) return;
      o[k] = cells[i] ?? '';
    });
    rawHeaders.forEach((raw, i) => {
      if (raw && o[raw] == null) o[raw] = cells[i] ?? '';
    });
    o.followedPlan = String(o.followedPlan || '').toLowerCase() === 'true';
    return o;
  });
}

/**
 * Full CSV import evaluation (pure). Persist is caller's job.
 */
export function buildCsvImportResult(text, userId, options = {}) {
  const debug = options.debug === true;
  const account = options.account || 'Cuenta principal';
  const existingSignatures = options.existingSignatures instanceof Set
    ? options.existingSignatures
    : new Set(options.existingSignatures || []);

  const signature = options.signatureFn || ((t) => [
    userId,
    t.tradingDay || t.date || '',
    String(t.asset || '').toUpperCase(),
    String(t.side || ''),
    Number(t.resultMoney || 0),
    Number(t.resultR || 0),
    String(t.setup || '')
  ].join('|'));

  const rows = parseCsv(text, userId);
  const imported = [];
  const skipped = [];

  if (!rows.length) {
    return {
      imported,
      skipped,
      summary: { importedCount: 0, skippedCount: 0, totalRows: 0 }
    };
  }

  rows.forEach((row) => {
    const rowNumber = Number(row.__rowNumber) || skipped.length + imported.length + 1;
    if (row.__unsupported) {
      skipped.push({
        rowNumber,
        reasonCode: 'unsupported-format',
        reason: CSV_SKIP_REASONS['unsupported-format'],
        rawRow: { line: row.__rawLine },
        normalizedPreview: null
      });
      return;
    }

    const evaluated = evaluateImportedTradeRow(row, userId, { rowNumber, account });
    if (debug) {
      console.log('[debugImport] row', rowNumber, { raw: row, evaluated });
    }
    if (!evaluated.ok) {
      skipped.push(evaluated.skipped);
      return;
    }

    const trade = evaluated.trade;
    const sig = signature(trade);
    if (existingSignatures.has(sig)) {
      skipped.push({
        rowNumber,
        reasonCode: 'duplicate-trade',
        reason: CSV_SKIP_REASONS['duplicate-trade'],
        rawRow: row,
        normalizedPreview: {
          date: trade.date,
          asset: trade.asset,
          resultMoney: trade.resultMoney,
          resultR: trade.resultR
        }
      });
      return;
    }
    existingSignatures.add(sig);
    imported.push(trade);
    if (debug) console.log('[debugImport] imported shape', trade);
  });

  return {
    imported,
    skipped,
    summary: {
      importedCount: imported.length,
      skippedCount: skipped.length,
      totalRows: rows.length
    }
  };
}

/** Human toast copy for import result. Returns { text, type }. */
export function formatCsvImportToast(result) {
  const importedCount = Number(result?.summary?.importedCount || 0);
  const skippedCount = Number(result?.summary?.skippedCount || 0);
  const firstSkip = (result?.skipped || [])[0];

  if (importedCount === 0 && skippedCount === 0) {
    return { text: 'El CSV está vacío o no tiene filas válidas.', type: 'error' };
  }
  if (importedCount === 0 && skippedCount > 0) {
    const detail = firstSkip
      ? `Fila ${firstSkip.rowNumber}: ${firstSkip.reason}`
      : '';
    const text = [
      'No se importó ningún trade',
      `${skippedCount} fila${skippedCount === 1 ? '' : 's'} omitida${skippedCount === 1 ? '' : 's'}`,
      detail
    ].filter(Boolean).join(' · ');
    return { text, type: 'error' };
  }
  if (importedCount > 0 && skippedCount === 0) {
    return {
      text: `${importedCount} trade${importedCount === 1 ? '' : 's'} importado${importedCount === 1 ? '' : 's'} correctamente`,
      type: 'success'
    };
  }
  return {
    text: `${importedCount} trade${importedCount === 1 ? '' : 's'} importado${importedCount === 1 ? '' : 's'} · ${skippedCount} omitido${skippedCount === 1 ? '' : 's'}`,
    type: 'info'
  };
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

export function sanitizeFirestoreValue(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeFirestoreValue).filter(v => v !== undefined);
  if (Object.prototype.toString.call(value) !== '[object Object]') return value;
  const out = {};
  Object.entries(value).forEach(([k, v]) => {
    const clean = sanitizeFirestoreValue(v);
    if (clean !== undefined) out[k] = clean;
  });
  return out;
}

export function sanitizeFirestoreObject(obj = {}) {
  return sanitizeFirestoreValue(obj) || {};
}

export function normalizedAccounts(settings = {}) {
  const list = Array.isArray(settings.accounts) ? settings.accounts : [];
  const base = list.length ? list : [{ id: 'main', name: 'Cuenta principal', capital: Number(settings.initialBalance || 10000), type: 'Personal', currency: 'USD' }];
  return base.map((a, i) => ({
    id: a.id || `acc_${i}`,
    name: String(a.name || 'Cuenta principal').trim() || 'Cuenta principal',
    capital: Number(a.capital || a.initialBalance || settings.initialBalance || 10000),
    type: a.type || 'Personal',
    currency: a.currency || 'USD'
  }));
}
