import { today, safeDate } from './dateUtils.js';
import { normalizeTradeArrayFields, safeArray, toNumberSafe, normalizeTradeSetup, accountName } from './tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from './analyticsUtils.js';

export function exportSafeDate(value) {
  try {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value?.toDate) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    return String(value);
  } catch { return String(value || ''); }
}

export function exportText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(exportText).filter(Boolean).join('|');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function normalizeTradeForExport(trade = {}) {
  const t = normalizeTradeArrayFields(trade);
  const date = String(t.tradingDay || t.date || safeDate(t.createdAt) || today()).slice(0, 10);
  return {
    id: t.id || '',
    date,
    tradingDay: t.tradingDay || date,
    createdAt: exportSafeDate(t.createdAt),
    updatedAt: exportSafeDate(t.updatedAt),
    symbol: t.asset || t.symbol || '',
    account: accountName(t),
    session: t.session || '',
    direction: t.side || t.direction || '',
    entry: t.entry ?? '',
    stopLoss: t.sl ?? t.stopLoss ?? '',
    takeProfit: t.tp ?? t.takeProfit ?? '',
    exit: t.exit ?? '',
    result: t.result || '',
    resultR: toNumberSafe(t.resultR),
    resultPct: toNumberSafe(t.resultPct),
    profitLossMoney: toNumberSafe(t.resultMoney),
    riskMoney: toNumberSafe(t.riskMoney),
    riskPct: toNumberSafe(t.riskPct),
    system: t.tradeSystem || t.system || '',
    setup: normalizeTradeSetup(t),
    pattern: t.pattern || t.checklistPattern || '',
    quality: t.quality || '',
    checklist: safeArray(t.checklist),
    confluences: safeArray(t.confluencesUsed),
    checklistValidation: {
      checklistId: trade.checklistId || '',
      createdFromChecklist: trade.createdFromChecklist === true,
      finalGreen: trade.checklistFinalGreen === true,
      score: trade.checklistScore ?? '',
      aPlus: trade.checklistAPlus === true,
      operationalState: trade.checklistOperationalState || '',
      executedWithoutFullChecklist: trade.executedWithoutFullChecklist === true
    },
    behavior: {
      followedPlan: t.followedPlan === true,
      score: Number(t.behaviorScore || behaviorScoreFromTrade(t)),
      scoreLabel: t.behaviorScoreLabel || behaviorScoreLabel(behaviorScoreFromTrade(t)),
      emotionBefore: t.emotionBefore || '',
      emotionDuring: t.emotionDuring || '',
      emotionAfter: t.emotionAfter || '',
      executionBehaviors: safeArray(t.executionBehaviors),
      postTradeBehavior: t.postTradeBehavior || '',
      respetoProceso: t.respetoProceso || '',
      estadoMental: t.estadoMental || '',
      motivoOperacion: t.motivoOperacion || '',
      notasComportamiento: t.notasComportamiento || ''
    },
    contextQuality: {
      calidadTesis: t.calidadTesis ?? '',
      calidadEjecucion: t.calidadEjecucion ?? '',
      calidadComportamiento: t.calidadComportamiento ?? '',
      calidadRevision: t.calidadRevision ?? '',
      indiceCalidadContextual: t.indiceCalidadContextual ?? '',
      alineacionMacro: t.alineacionMacro || '',
      alineacionHTF: t.alineacionHTF || '',
      alineacionIntra: t.alineacionIntra || '',
      liquidezClara: t.liquidezClara || '',
      dxyConfirma: t.dxyConfirma || '',
      zonaConFuncion: t.zonaConFuncion || '',
      notasContexto: t.notasContexto || ''
    },
    notes: t.lesson || t.notes || '',
    privateJournal: t.privateJournal || '',
    screenshots: safeArray(t.screenshots).length ? safeArray(t.screenshots) : [t.captureLink, t.captureUrl, t.captureFileName].filter(Boolean),
    captureLink: t.captureLink || '',
    captureUrl: t.captureUrl || '',
    captureFileName: t.captureFileName || '',
    tags: safeArray(t.tags),
    status: trade.status || trade.mentorReviewStatus || 'saved',
    mentorReview: {
      requested: trade.mentorReviewRequested === true,
      status: trade.mentorReviewStatus || '',
      focus: trade.mentorReviewFocus || '',
      note: trade.mentorReviewNote || '',
      response: trade.mentorReviewResponse || ''
    }
  };
}

export function flattenTradeForCsv(trade) {
  const t = normalizeTradeForExport(trade);
  return {
    id: t.id, date: t.date, tradingDay: t.tradingDay, symbol: t.symbol, account: t.account, session: t.session, direction: t.direction,
    entry: t.entry, stopLoss: t.stopLoss, takeProfit: t.takeProfit, exit: t.exit, result: t.result, resultR: t.resultR, resultPct: t.resultPct,
    profitLossMoney: t.profitLossMoney, riskMoney: t.riskMoney, riskPct: t.riskPct, system: t.system, setup: t.setup, pattern: t.pattern, quality: t.quality,
    checklist: exportText(t.checklist), confluences: exportText(t.confluences), checklistFinalGreen: t.checklistValidation.finalGreen, checklistScore: t.checklistValidation.score,
    followedPlan: t.behavior.followedPlan, behaviorScore: t.behavior.score, behaviorScoreLabel: t.behavior.scoreLabel, emotionBefore: t.behavior.emotionBefore,
    emotionDuring: t.behavior.emotionDuring, emotionAfter: t.behavior.emotionAfter, executionBehaviors: exportText(t.behavior.executionBehaviors),
    postTradeBehavior: t.behavior.postTradeBehavior, respetoProceso: t.behavior.respetoProceso, estadoMental: t.behavior.estadoMental, motivoOperacion: t.behavior.motivoOperacion,
    notasComportamiento: t.behavior.notasComportamiento, calidadTesis: t.contextQuality.calidadTesis, calidadEjecucion: t.contextQuality.calidadEjecucion,
    calidadComportamiento: t.contextQuality.calidadComportamiento, calidadRevision: t.contextQuality.calidadRevision, indiceCalidadContextual: t.contextQuality.indiceCalidadContextual,
    alineacionMacro: t.contextQuality.alineacionMacro, alineacionHTF: t.contextQuality.alineacionHTF, alineacionIntra: t.contextQuality.alineacionIntra,
    liquidezClara: t.contextQuality.liquidezClara, dxyConfirma: t.contextQuality.dxyConfirma, zonaConFuncion: t.contextQuality.zonaConFuncion, notasContexto: t.contextQuality.notasContexto,
    notes: t.notes, privateJournal: t.privateJournal, screenshots: exportText(t.screenshots), captureLink: t.captureLink, captureUrl: t.captureUrl, captureFileName: t.captureFileName,
    tags: exportText(t.tags), status: t.status, mentorReviewRequested: t.mentorReview.requested, mentorReviewStatus: t.mentorReview.status, mentorReviewFocus: t.mentorReview.focus,
    mentorReviewNote: t.mentorReview.note, mentorReviewResponse: t.mentorReview.response, createdAt: t.createdAt, updatedAt: t.updatedAt
  };
}

export function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportToJson(data, filename) { downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8'); }
export function escapeCsvCell(value) { return `"${exportText(value).replaceAll('"', '""').replace(/\r?\n/g, '\n')}"`; }

export function exportToCsv(rows, filename) {
  const safeRows = rows || [];
  const headers = Object.keys(safeRows[0] || flattenTradeForCsv({}));
  const body = [headers.join(','), ...safeRows.map(row => headers.map(h => escapeCsvCell(row[h])).join(','))].join('\n');
  downloadBlob(`\uFEFF${body}`, filename, 'text/csv;charset=utf-8');
}

export function sanitizeFilenamePart(value) { return String(value || 'trade').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'trade'; }

export function buildTradeExportFilename(trade, extension) {
  const symbol = sanitizeFilenamePart(trade.asset || trade.symbol || 'trade').toUpperCase();
  const date = sanitizeFilenamePart(String(trade.tradingDay || trade.date || safeDate(trade.createdAt) || today()).slice(0, 10));
  return `mtc-trade-${symbol}-${date}.${extension}`;
}

export function buildTradesExportFilename(extension) { return `mtc-trades-export-${today()}.${extension}`; }
