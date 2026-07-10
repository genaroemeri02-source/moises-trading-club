/**
 * Sprint 05 — OperationalState
 * Pure cockpit layer: ready | caution | blocked
 * No DOM, no Firebase, no side effects.
 */

import { getTradeOperationalDateKey, tradingDayKey } from './dateUtils.js';
import { toNumberSafe, parseLimitMoney, isClosedEvaluableTrade, safeArray } from './tradeUtils.js';
import { calc, realizedRValue } from './analyticsUtils.js';

export const OPERATIONAL_STATUS = Object.freeze({
  READY: 'ready',
  CAUTION: 'caution',
  BLOCKED: 'blocked'
});

export const OPERATIONAL_LABEL = Object.freeze({
  ready: 'Apto',
  caution: 'Precaución',
  blocked: 'Bloqueado'
});

export const OPERATIONAL_SEVERITY = Object.freeze({
  ready: 'success',
  caution: 'warning',
  blocked: 'danger'
});

export const OPERATIONAL_DEFAULTS = Object.freeze({
  maxTradesPerDay: 1,
  dailyLossLimitR: -1,
  weeklyLossLimitR: -3,
  maxDrawdownPct: 5,
  emotionalHighRiskThreshold: 7,
  emotionalModerateThreshold: 5,
  dailyLossPartialRatio: 0.5,
  nearMaxTradesOffset: 1
});

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolveNow(now) {
  if (now instanceof Date && Number.isFinite(now.getTime())) return now;
  if (typeof now === 'number' && Number.isFinite(now)) {
    const d = new Date(now);
    return Number.isFinite(d.getTime()) ? d : new Date();
  }
  if (typeof now === 'string' && now.trim()) {
    const d = new Date(now);
    return Number.isFinite(d.getTime()) ? d : new Date();
  }
  return new Date();
}

function resolveDayKey(now, explicitDayKey) {
  if (typeof explicitDayKey === 'string' && /^\d{4}-\d{2}-\d{2}/.test(explicitDayKey)) {
    return explicitDayKey.slice(0, 10);
  }
  return tradingDayKey(resolveNow(now));
}

/** Monday-start ISO week for a trading day key (aligned with dateUtils.weekStartISO). */
export function weekStartFromDayKey(dayKey) {
  const base = String(dayKey || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return tradingDayKey();
  const d = new Date(`${base}T12:00:00`);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function tradePnl(trade = {}) {
  return toNumberSafe(trade.resultMoney ?? trade.pnl ?? trade.pl);
}

function tradeR(trade = {}) {
  const r = realizedRValue(trade);
  if (Number.isFinite(r) && r !== 0) return r;
  return toNumberSafe(trade.resultR);
}

function hasLoss(trade = {}) {
  const money = tradePnl(trade);
  const r = tradeR(trade);
  if (money < 0) return true;
  if (r < 0) return true;
  return false;
}

function resolveAccountCapital(account = {}, riskSettings = {}) {
  const candidates = [
    account.capital,
    account.initialBalance,
    account.accountCapital,
    account.balance,
    riskSettings.accountCapital,
    riskSettings.initialBalance
  ];
  for (const value of candidates) {
    const n = finiteOrNull(value);
    if (n != null && n > 0) return n;
  }
  return 10000;
}

function resolveMaxTradesPerDay(riskSettings = {}) {
  const candidates = [
    riskSettings.maxTradesPerDay,
    riskSettings.maxTradesDay,
    riskSettings.maxTrades
  ];
  for (const value of candidates) {
    const n = finiteOrNull(value);
    if (n != null && n >= 0) return Math.floor(n);
  }
  return OPERATIONAL_DEFAULTS.maxTradesPerDay;
}

function resolveDailyLossLimitR(riskSettings = {}) {
  const candidates = [
    riskSettings.dailyLossLimitR,
    riskSettings.maxDailyLossR,
    riskSettings.maxDailyR
  ];
  for (const value of candidates) {
    const n = finiteOrNull(value);
    if (n != null) return n <= 0 ? n : -Math.abs(n);
  }
  return OPERATIONAL_DEFAULTS.dailyLossLimitR;
}

function resolveWeeklyLossLimitR(riskSettings = {}) {
  const candidates = [
    riskSettings.weeklyLossLimitR,
    riskSettings.maxWeeklyLossR,
    riskSettings.maxWeeklyR
  ];
  for (const value of candidates) {
    const n = finiteOrNull(value);
    if (n != null) return n <= 0 ? n : -Math.abs(n);
  }
  return OPERATIONAL_DEFAULTS.weeklyLossLimitR;
}

function resolveDailyLossLimitMoney(riskSettings = {}, dailyPlan = null) {
  const fromSettings = parseLimitMoney(riskSettings.maxDailyLoss ?? riskSettings.dailyLossLimit);
  const fromPlan = parseLimitMoney(dailyPlan?.maxRisk ?? dailyPlan?.maxDailyLoss);
  if (fromSettings > 0) return fromSettings;
  if (fromPlan > 0) return fromPlan;
  return 0;
}

function resolveWeeklyLossLimitMoney(riskSettings = {}) {
  return parseLimitMoney(riskSettings.maxWeeklyLoss ?? riskSettings.weeklyLossLimit);
}

function resolveMaxDrawdownPct(riskSettings = {}) {
  const n = finiteOrNull(riskSettings.maxDrawdownPct ?? riskSettings.drawdownLimitPct);
  if (n != null && n > 0) return n;
  return OPERATIONAL_DEFAULTS.maxDrawdownPct;
}

function previousEquity(trades = [], dayKey, initial) {
  const prior = asArray(trades)
    .filter(t => {
      const d = getTradeOperationalDateKey(t);
      return d && d < dayKey && isClosedEvaluableTrade(t);
    })
    .reduce((sum, t) => sum + tradePnl(t), 0);
  return Number(initial || 0) + prior;
}

function readChecklistFlags(checklistState = {}) {
  const state = asObject(checklistState);
  const completeExplicit = state.complete ?? state.checklistComplete ?? state.finalGreen;
  const requiredExplicit = state.required ?? state.checklistRequired ?? state.mandatory;
  const missingExplicit = state.missing ?? state.checklistMissing;
  const attempting =
    state.attemptingToOperate === true ||
    state.attempting === true ||
    state.intentToOperate === true;

  let checklistComplete = null;
  if (typeof completeExplicit === 'boolean') checklistComplete = completeExplicit;
  else if (completeExplicit === 'green' || completeExplicit === 'ok') checklistComplete = true;
  else if (completeExplicit === 'red' || completeExplicit === 'incomplete') checklistComplete = false;
  else if (finiteOrNull(state.score) != null) checklistComplete = Number(state.score) >= 85 && state.finalGreen !== false;

  let checklistRequired = false;
  if (typeof requiredExplicit === 'boolean') checklistRequired = requiredExplicit;

  let checklistMissing = false;
  if (typeof missingExplicit === 'boolean') checklistMissing = missingExplicit;
  else if (Array.isArray(missingExplicit)) checklistMissing = missingExplicit.length > 0;
  else if (checklistComplete === false) checklistMissing = true;

  if (checklistComplete == null && checklistMissing) checklistComplete = false;
  if (checklistComplete == null && !Object.keys(state).length) {
    return {
      checklistComplete: true,
      checklistMissing: false,
      checklistRequired: false,
      attemptingToOperate: attempting,
      known: false
    };
  }

  return {
    checklistComplete: checklistComplete !== false,
    checklistMissing: checklistMissing || checklistComplete === false,
    checklistRequired,
    attemptingToOperate: attempting,
    known: checklistComplete != null || checklistRequired || checklistMissing || attempting
  };
}

function isRecoveryFlag(value) {
  if (value === true) return true;
  const n = finiteOrNull(value);
  if (n != null) return n >= OPERATIONAL_DEFAULTS.emotionalHighRiskThreshold;
  return false;
}

/**
 * Read emotionalState / Sprint 06 emotionSignals.
 * Accepts legacy emotionalState and compact operationalSignals.
 *
 * Sprint 07 hotfix: signals with `isCurrent === false` never gate trading.
 * Historical emotion intelligence must not block the current session.
 */
function readEmotionalSignals(emotionalState = {}) {
  const state = asObject(emotionalState);
  if (!Object.keys(state).length) {
    return {
      anxiety: null,
      recoveryImpulse: false,
      clarity: null,
      dominantState: null,
      emotionalRisk: 'unknown',
      shouldBlockTrading: false,
      shouldReduceRisk: false,
      postLossProtocolRequired: false,
      emotionReason: null,
      known: false,
      isCurrent: false
    };
  }

  // Explicit non-current payload from Emotion Intelligence → ignore for gating.
  if (state.isCurrent === false) {
    return {
      anxiety: null,
      recoveryImpulse: false,
      clarity: null,
      dominantState: null,
      emotionalRisk: 'unknown',
      shouldBlockTrading: false,
      shouldReduceRisk: false,
      postLossProtocolRequired: false,
      emotionReason: typeof state.reason === 'string' ? state.reason : 'Sin check-in emocional de la jornada actual.',
      known: false,
      isCurrent: false
    };
  }

  const anxiety = finiteOrNull(state.anxiety ?? state.anxietyLevel);
  const clarity = finiteOrNull(
    state.clarity ?? state.clarityLevel ?? state.confidence ?? state.confidenceLevel
  );
  const recoveryImpulse =
    isRecoveryFlag(state.recoveryImpulse) ||
    state.feltRevengeImpulse === true ||
    state.revenge === true ||
    state.postLossProtocolRequired === true ||
    normalizedIncludes(state.dominantState, ['recuperar', 'revenge', 'tilt']) ||
    normalizedIncludes(state.recentEmotionalState, ['recuperar', 'revenge', 'tilt']);

  const dominantState =
    state.dominantState ?? state.recentEmotionalState ?? state.state ?? state.mood ?? null;
  const threshold = OPERATIONAL_DEFAULTS.emotionalHighRiskThreshold;
  const moderate = OPERATIONAL_DEFAULTS.emotionalModerateThreshold;
  const shouldBlockTrading = state.shouldBlockTrading === true;
  const shouldReduceRisk = state.shouldReduceRisk === true;
  const postLossProtocolRequired = state.postLossProtocolRequired === true;
  const emotionReason = typeof state.reason === 'string' && state.reason.trim() ? state.reason.trim() : null;

  let emotionalRisk = state.emotionalRisk;
  if (!['low', 'medium', 'high', 'unknown'].includes(emotionalRisk)) {
    if (shouldBlockTrading || postLossProtocolRequired) emotionalRisk = 'high';
    else if (anxiety != null && anxiety >= threshold) emotionalRisk = 'high';
    else if (recoveryImpulse && (anxiety == null || anxiety >= moderate)) emotionalRisk = 'high';
    else if (shouldReduceRisk) emotionalRisk = 'medium';
    else if (clarity != null && clarity <= 4) emotionalRisk = 'medium';
    else if (anxiety != null && anxiety >= moderate) emotionalRisk = 'medium';
    else if (anxiety != null || clarity != null || dominantState) emotionalRisk = 'low';
    else emotionalRisk = 'unknown';
  }

  return {
    anxiety,
    recoveryImpulse,
    clarity,
    dominantState,
    emotionalRisk,
    shouldBlockTrading,
    shouldReduceRisk,
    postLossProtocolRequired,
    emotionReason,
    known: true,
    isCurrent: state.isCurrent === true || state.isCurrent == null
  };
}

function normalizedIncludes(value, needles = []) {
  const text = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return needles.some(n => text.includes(String(n).toLowerCase()));
}

function detectRiskyConduct(tradesToday = []) {
  const flags = ['Operé por impulso', 'Sobreoperé', 'Me anticipé', 'Moví el stop', 'Rompí reglas'];
  return asArray(tradesToday).some(t => {
    const behaviors = [...safeArray(t.executionBehaviors), t.postTradeBehavior, t.quality];
    return behaviors.some(x => flags.includes(x)) || String(t.quality || '') === 'Impulsivo';
  });
}

/**
 * Normalize raw cockpit inputs into a stable evaluation shape.
 * Tolerates missing fields and never mutates the original trades array.
 */
export function normalizeOperationalInputs(input = {}) {
  const raw = asObject(input);
  const riskSettings = asObject(raw.riskSettings || raw.settings || raw.risk);
  const account = asObject(raw.account);
  const checklistState = asObject(raw.checklistState || raw.checklist);
  // Sprint 06: prefer emotionSignals / operationalSignals when present.
  const emotionalState = asObject(
    raw.emotionSignals ||
      raw.emotionalSignals ||
      raw.emotionalState ||
      raw.emotion ||
      raw.journalEmotional
  );
  const dailyPlan = asObject(raw.dailyPlan || raw.plan);
  const now = resolveNow(raw.now);
  const dayKey = resolveDayKey(now, raw.dayKey || raw.tradingDay || raw.today);
  const weekStart = weekStartFromDayKey(dayKey);
  const trades = asArray(raw.trades);

  const todayTrades = trades.filter(t => getTradeOperationalDateKey(t) === dayKey);
  const weekTrades = trades.filter(t => {
    const d = getTradeOperationalDateKey(t);
    return d && d >= weekStart && d <= dayKey;
  });

  const dailyPnl = todayTrades.reduce((sum, t) => sum + tradePnl(t), 0);
  const weeklyPnl = weekTrades.reduce((sum, t) => sum + tradePnl(t), 0);
  const dailyR = todayTrades.reduce((sum, t) => sum + tradeR(t), 0);
  const weeklyR = weekTrades.reduce((sum, t) => sum + tradeR(t), 0);

  const maxTradesPerDay = resolveMaxTradesPerDay(riskSettings);
  const dailyLossLimitR = resolveDailyLossLimitR(riskSettings);
  const weeklyLossLimitR = resolveWeeklyLossLimitR(riskSettings);
  const dailyLossLimitMoney = resolveDailyLossLimitMoney(riskSettings, dailyPlan);
  const weeklyLossLimitMoney = resolveWeeklyLossLimitMoney(riskSettings);
  const maxDrawdownPct = resolveMaxDrawdownPct(riskSettings);
  const capital = resolveAccountCapital(account, riskSettings);
  const dayStartEquity = previousEquity(trades, dayKey, capital);
  const dayStats = calc(todayTrades, dayStartEquity || capital);
  const drawdownPct = Number(dayStats?.maxDD || 0);

  const recentLoss = todayTrades.some(hasLoss);
  const checklist = readChecklistFlags(checklistState);
  const emotional = readEmotionalSignals(emotionalState);
  const riskyConduct = detectRiskyConduct(todayTrades);

  const hasTradeData = trades.length > 0;
  const hasRiskSettings = Object.keys(riskSettings).length > 0;
  const incompleteData = !hasTradeData && !hasRiskSettings && !checklist.known && !emotional.known;

  return {
    now,
    dayKey,
    weekStart,
    tradesTodayList: todayTrades,
    weekTradesList: weekTrades,
    tradesToday: todayTrades.length,
    maxTradesPerDay,
    dailyPnl,
    weeklyPnl,
    dailyR,
    weeklyR,
    dailyLossLimitR,
    weeklyLossLimitR,
    dailyLossLimitMoney,
    weeklyLossLimitMoney,
    maxDrawdownPct,
    drawdownPct,
    capital,
    dayStartEquity,
    recentLoss,
    riskyConduct,
    checklistComplete: checklist.checklistComplete,
    checklistMissing: checklist.checklistMissing,
    checklistRequired: checklist.checklistRequired,
    attemptingToOperate: checklist.attemptingToOperate,
    checklistKnown: checklist.known,
    anxiety: emotional.anxiety,
    recoveryImpulse: emotional.recoveryImpulse,
    clarity: emotional.clarity,
    dominantState: emotional.dominantState,
    emotionalRisk: emotional.emotionalRisk,
    emotionalKnown: emotional.known,
    shouldBlockTrading: emotional.shouldBlockTrading === true,
    shouldReduceRisk: emotional.shouldReduceRisk === true,
    postLossProtocolRequired: emotional.postLossProtocolRequired === true,
    emotionReason: emotional.emotionReason || null,
    incompleteData,
    hasTradeData,
    hasRiskSettings,
    emotionIsCurrent: emotional.isCurrent === true
  };
}

/**
 * Hard risk-limit evaluation (money + R + trades + drawdown).
 */
export function evaluateRiskLimits(normalized = {}) {
  const n = asObject(normalized);
  const dailyLossLimitHit =
    (n.dailyLossLimitMoney > 0 && n.dailyPnl <= -Math.abs(n.dailyLossLimitMoney)) ||
    (n.dailyLossLimitR != null && n.dailyR <= n.dailyLossLimitR);

  const weeklyLossLimitHit =
    (n.weeklyLossLimitMoney > 0 && n.weeklyPnl <= -Math.abs(n.weeklyLossLimitMoney)) ||
    (n.weeklyLossLimitR != null && n.weeklyR <= n.weeklyLossLimitR);

  const drawdownLimitHit =
    n.maxDrawdownPct > 0 && Number(n.drawdownPct || 0) >= Number(n.maxDrawdownPct);

  const maxTradesHit =
    n.maxTradesPerDay > 0 && Number(n.tradesToday || 0) >= Number(n.maxTradesPerDay);

  const dailyLossPartial =
    !dailyLossLimitHit && (
      (n.dailyLossLimitMoney > 0 && n.dailyPnl <= -Math.abs(n.dailyLossLimitMoney) * OPERATIONAL_DEFAULTS.dailyLossPartialRatio) ||
      (n.dailyLossLimitR != null && n.dailyR <= n.dailyLossLimitR * OPERATIONAL_DEFAULTS.dailyLossPartialRatio)
    );

  const nearMaxTrades =
    !maxTradesHit &&
    n.maxTradesPerDay > 1 &&
    Number(n.tradesToday || 0) >= Math.max(1, n.maxTradesPerDay - OPERATIONAL_DEFAULTS.nearMaxTradesOffset);

  return {
    dailyLossLimitHit: !!dailyLossLimitHit,
    weeklyLossLimitHit: !!weeklyLossLimitHit,
    drawdownLimitHit: !!drawdownLimitHit,
    maxTradesHit: !!maxTradesHit,
    dailyLossPartial: !!dailyLossPartial,
    nearMaxTrades: !!nearMaxTrades
  };
}

/**
 * Checklist risk flags for cockpit gating.
 */
export function evaluateChecklistRisk(normalized = {}) {
  const n = asObject(normalized);
  return {
    checklistComplete: n.checklistComplete !== false,
    checklistMissing: n.checklistMissing === true || n.checklistComplete === false,
    checklistRequired: n.checklistRequired === true,
    attemptingToOperate: n.attemptingToOperate === true,
    known: n.checklistKnown === true
  };
}

/**
 * Emotional risk layer. Unknown when no journal signal exists.
 */
export function evaluateEmotionalRisk(normalized = {}) {
  const n = asObject(normalized);
  const anxiety = finiteOrNull(n.anxiety);
  const recoveryImpulse = n.recoveryImpulse === true;
  const clarity = finiteOrNull(n.clarity);
  const dominantState = n.dominantState ?? null;
  let emotionalRisk = n.emotionalRisk;
  if (!['low', 'medium', 'high', 'unknown'].includes(emotionalRisk)) {
    emotionalRisk = 'unknown';
  }
  return {
    anxiety,
    recoveryImpulse,
    clarity,
    dominantState,
    emotionalRisk,
    shouldBlockTrading: n.shouldBlockTrading === true,
    shouldReduceRisk: n.shouldReduceRisk === true,
    postLossProtocolRequired: n.postLossProtocolRequired === true,
    emotionReason: n.emotionReason || null,
    known: n.emotionalKnown === true,
    isCurrent: n.emotionIsCurrent === true || n.emotionalKnown === true
  };
}

function pushReason(list, reason) {
  if (!reason?.code) return;
  if (list.some(r => r.code === reason.code)) return;
  list.push(reason);
}

/**
 * Build ordered operational reasons from normalized inputs + evaluations.
 */
export function buildOperationalReasons(normalized = {}, evaluations = {}) {
  const n = asObject(normalized);
  const risk = asObject(evaluations.risk);
  const checklist = asObject(evaluations.checklist);
  const emotional = asObject(evaluations.emotional);
  const reasons = [];

  if (risk.dailyLossLimitHit) {
    pushReason(reasons, {
      code: 'daily_loss_limit',
      level: 'danger',
      title: 'Límite diario alcanzado',
      detail: `P/L del día ${formatSigned(n.dailyPnl)} (${formatRSigned(n.dailyR)}).`,
      metric: `${formatRSigned(n.dailyR)} / ${formatRSigned(n.dailyLossLimitR)}`,
      action: 'Detener operativa y registrar post-loss protocol.'
    });
  }

  if (risk.weeklyLossLimitHit) {
    pushReason(reasons, {
      code: 'weekly_loss_limit',
      level: 'danger',
      title: 'Límite semanal alcanzado',
      detail: `P/L semanal ${formatSigned(n.weeklyPnl)} (${formatRSigned(n.weeklyR)}).`,
      metric: `${formatRSigned(n.weeklyR)} / ${formatRSigned(n.weeklyLossLimitR)}`,
      action: 'Pausar la semana y revisar riesgo.'
    });
  }

  if (risk.drawdownLimitHit) {
    pushReason(reasons, {
      code: 'drawdown_limit',
      level: 'danger',
      title: 'Drawdown máximo alcanzado',
      detail: `Drawdown de jornada ${Number(n.drawdownPct || 0).toFixed(2)}% ≥ ${Number(n.maxDrawdownPct || 0).toFixed(2)}%.`,
      metric: `${Number(n.drawdownPct || 0).toFixed(2)}%`,
      action: 'Pasar a modo reflexión. No abrir nuevas entradas.'
    });
  }

  if (risk.maxTradesHit) {
    pushReason(reasons, {
      code: 'max_trades_day',
      level: 'danger',
      title: 'Máximo de trades del día alcanzado',
      detail: `${n.tradesToday}/${n.maxTradesPerDay} trades en la jornada actual.`,
      metric: `${n.tradesToday}/${n.maxTradesPerDay}`,
      action: 'Cerrar la sesión operativa.'
    });
  }

  if (checklist.checklistRequired && checklist.checklistMissing && checklist.attemptingToOperate) {
    pushReason(reasons, {
      code: 'checklist_required_incomplete',
      level: 'danger',
      title: 'Checklist requerido incompleto',
      detail: 'Intentás operar sin checklist completo.',
      action: 'Completar checklist antes de validar una entrada.'
    });
  } else if (checklist.checklistMissing) {
    pushReason(reasons, {
      code: 'checklist_incomplete',
      level: 'warning',
      title: 'Checklist incompleto',
      detail: 'Completalo antes de validar una nueva entrada.',
      action: 'Abrir checklist y cerrar validación.'
    });
  }

  if (
    n.recentLoss &&
    emotional.known &&
    (emotional.emotionalRisk === 'high' ||
      emotional.recoveryImpulse ||
      emotional.shouldBlockTrading ||
      emotional.postLossProtocolRequired)
  ) {
    pushReason(reasons, {
      code: 'recent_loss_emotional_high',
      level: 'danger',
      title: 'Pérdida reciente + riesgo emocional alto',
      detail:
        emotional.emotionReason ||
        (emotional.recoveryImpulse || emotional.postLossProtocolRequired
          ? 'Pérdida del día con impulso de recuperación detectado.'
          : `Pérdida del día con ansiedad ${emotional.anxiety ?? '—'}/10.`),
      metric: emotional.anxiety != null ? `${emotional.anxiety}/10` : undefined,
      action: 'Activar post-loss protocol. No re-entrar.'
    });
  } else if (
    emotional.known &&
    (emotional.shouldBlockTrading || emotional.emotionalRisk === 'high')
  ) {
    pushReason(reasons, {
      code: 'emotional_high',
      level: 'danger',
      title: 'Riesgo emocional alto',
      detail:
        emotional.emotionReason ||
        (emotional.recoveryImpulse
          ? 'Impulso de recuperación activo.'
          : `Ansiedad ${emotional.anxiety ?? '—'}/10 por encima del umbral.`),
      metric: emotional.anxiety != null ? `${emotional.anxiety}/10` : undefined,
      action: 'Pausar operativa hasta estabilizar estado.'
    });
  } else if (n.recentLoss) {
    pushReason(reasons, {
      code: 'recent_loss',
      level: 'warning',
      title: 'Pérdida reciente detectada',
      detail: 'Evitá segunda operación impulsiva.',
      action: 'Reducir riesgo o pausar la siguiente entrada.'
    });
  } else if (
    emotional.known &&
    (emotional.shouldReduceRisk ||
      emotional.emotionalRisk === 'medium' ||
      (emotional.clarity != null && emotional.clarity <= 4))
  ) {
    pushReason(reasons, {
      code: 'emotional_medium',
      level: 'warning',
      title: 'Carga emocional moderada',
      detail:
        emotional.emotionReason ||
        (emotional.clarity != null && emotional.clarity <= 4
          ? `Claridad ${emotional.clarity}/10. Reducí riesgo hasta estabilizar.`
          : `Ansiedad ${emotional.anxiety ?? '—'}/10. Operar solo setup A+ con tamaño reducido.`),
      metric:
        emotional.anxiety != null
          ? `${emotional.anxiety}/10`
          : emotional.clarity != null
            ? `claridad ${emotional.clarity}/10`
            : undefined,
      action: 'Reducir riesgo y exigir checklist completo.'
    });
  }

  if (risk.dailyLossPartial) {
    pushReason(reasons, {
      code: 'daily_loss_partial',
      level: 'warning',
      title: 'Pérdida diaria parcial relevante',
      detail: `P/L del día ${formatSigned(n.dailyPnl)} (${formatRSigned(n.dailyR)}) cerca del límite.`,
      metric: formatRSigned(n.dailyR),
      action: 'Reducir tamaño o detener si no hay setup A+.'
    });
  }

  if (risk.nearMaxTrades) {
    pushReason(reasons, {
      code: 'near_max_trades',
      level: 'warning',
      title: 'Cerca del máximo de trades',
      detail: `${n.tradesToday}/${n.maxTradesPerDay} trades. Queda margen mínimo.`,
      metric: `${n.tradesToday}/${n.maxTradesPerDay}`,
      action: 'Reservar el cupo solo para setup validado.'
    });
  }

  if (n.riskyConduct && !risk.dailyLossLimitHit && !risk.maxTradesHit) {
    pushReason(reasons, {
      code: 'risky_conduct',
      level: 'warning',
      title: 'Conducta riesgosa en la jornada',
      detail: 'Señal de impulso / ruptura de plan en trades del día.',
      action: 'Forzar checklist y bajar riesgo.'
    });
  }

  if (n.incompleteData) {
    pushReason(reasons, {
      code: 'incomplete_data',
      level: 'info',
      title: 'Datos incompletos',
      detail: 'Sin trades, límites ni señales emocionales suficientes. Estado estimado de forma conservadora.',
      action: 'Completar Risk Lab / checklist / journal para mayor precisión.'
    });
  }

  return reasons;
}

/**
 * Map status + reasons to cockpit actions.
 */
export function buildOperationalActions(status, reasons = []) {
  const codes = new Set(asArray(reasons).map(r => r.code));
  const actions = [];

  const pushAction = action => {
    if (!action?.type) return;
    if (actions.some(a => a.type === action.type)) return;
    actions.push(action);
  };

  if (status === OPERATIONAL_STATUS.BLOCKED) {
    if (codes.has('recent_loss_emotional_high') || codes.has('daily_loss_limit') || codes.has('weekly_loss_limit')) {
      pushAction({
        type: 'post-loss-protocol',
        label: 'Registrar post-loss protocol',
        detail: 'Cerrar ciclo emocional/operativo antes de volver a operar.'
      });
    }
    if (codes.has('checklist_required_incomplete')) {
      pushAction({
        type: 'complete-checklist',
        label: 'Completar checklist',
        detail: 'Checklist requerido incompleto. No validar entrada.'
      });
    }
    pushAction({
      type: 'pause',
      label: 'Pausar operativa',
      detail: 'Estado bloqueado. No abrir nuevas entradas en esta jornada.'
    });
    return actions;
  }

  if (status === OPERATIONAL_STATUS.CAUTION) {
    if (codes.has('checklist_incomplete')) {
      pushAction({
        type: 'complete-checklist',
        label: 'Completar checklist',
        detail: 'Cerrá la validación antes de una nueva entrada.'
      });
    }
    if (codes.has('recent_loss') || codes.has('daily_loss_partial') || codes.has('emotional_medium') || codes.has('risky_conduct')) {
      pushAction({
        type: 'reduce-risk',
        label: 'Reducir riesgo',
        detail: 'Bajá tamaño / frecuencia hasta estabilizar la jornada.'
      });
    }
    if (codes.has('recent_loss') && !codes.has('post-loss-protocol')) {
      pushAction({
        type: 'post-loss-protocol',
        label: 'Revisar post-loss',
        detail: 'Confirmá que no hay impulso de segunda entrada.'
      });
    }
    if (!actions.length) {
      pushAction({
        type: 'reduce-risk',
        label: 'Operar con precaución',
        detail: 'Mantener tamaño reducido y filtro estricto de setup.'
      });
    }
    return actions;
  }

  pushAction({
    type: 'continue',
    label: 'Continuar con plan',
    detail: 'Riesgo dentro de parámetros. Ejecutar solo setups del plan.'
  });
  return actions;
}

function formatSigned(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n).toFixed(2);
  if (n > 0) return `+$${abs}`;
  if (n < 0) return `-$${abs}`;
  return `$${abs}`;
}

function formatRSigned(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}R`;
}

function resolveStatus({ risk, checklist, emotional, normalized }) {
  // Emotional gates only apply when Emotion Intelligence marked the signal as current.
  const emotionActive = emotional.known === true;
  const anxietyHigh =
    emotionActive &&
    emotional.anxiety != null &&
    emotional.anxiety >= OPERATIONAL_DEFAULTS.emotionalHighRiskThreshold;

  const blocked =
    risk.dailyLossLimitHit ||
    risk.weeklyLossLimitHit ||
    risk.drawdownLimitHit ||
    risk.maxTradesHit ||
    (checklist.checklistRequired && checklist.checklistMissing && checklist.attemptingToOperate) ||
    (emotionActive && emotional.shouldBlockTrading === true) ||
    (emotionActive && emotional.postLossProtocolRequired === true) ||
    (emotionActive && emotional.emotionalRisk === 'high') ||
    (emotionActive && normalized.recentLoss && anxietyHigh) ||
    (emotionActive &&
      normalized.recentLoss &&
      (emotional.emotionalRisk === 'high' || emotional.recoveryImpulse));

  if (blocked) return OPERATIONAL_STATUS.BLOCKED;

  const caution =
    normalized.recentLoss ||
    checklist.checklistMissing ||
    (emotionActive && emotional.shouldReduceRisk === true) ||
    (emotionActive && emotional.emotionalRisk === 'medium') ||
    (emotionActive && emotional.clarity != null && emotional.clarity <= 4) ||
    risk.nearMaxTrades ||
    risk.dailyLossPartial ||
    normalized.riskyConduct;

  if (caution) return OPERATIONAL_STATUS.CAUTION;
  return OPERATIONAL_STATUS.READY;
}

function computeScore(status, reasons = []) {
  if (status === OPERATIONAL_STATUS.BLOCKED) {
    const penalty = Math.min(40, asArray(reasons).filter(r => r.level === 'danger').length * 8);
    return Math.max(0, 30 - penalty);
  }
  if (status === OPERATIONAL_STATUS.CAUTION) {
    const warnings = asArray(reasons).filter(r => r.level === 'warning').length;
    return Math.max(40, 72 - warnings * 8);
  }
  const infoPenalty = asArray(reasons).some(r => r.code === 'incomplete_data') ? 8 : 0;
  return Math.max(70, 100 - infoPenalty);
}

function buildSummary(status, primaryReason, reasons = []) {
  if (status === OPERATIONAL_STATUS.BLOCKED) {
    if (primaryReason?.code === 'daily_loss_limit') {
      return 'Bloqueado: límite diario alcanzado. Próxima acción: registrar post-loss protocol.';
    }
    if (primaryReason?.code === 'weekly_loss_limit') {
      return 'Bloqueado: límite semanal alcanzado. Pausá la operativa.';
    }
    if (primaryReason?.code === 'drawdown_limit') {
      return 'Bloqueado: drawdown máximo alcanzado. Modo reflexión activo.';
    }
    if (primaryReason?.code === 'max_trades_day') {
      return 'Bloqueado: máximo de trades del día alcanzado.';
    }
    if (primaryReason?.code === 'checklist_required_incomplete') {
      return 'Bloqueado: checklist requerido incompleto. Completalo antes de operar.';
    }
    if (primaryReason?.code === 'recent_loss_emotional_high' || primaryReason?.code === 'emotional_high') {
      return 'Bloqueado: riesgo emocional alto. Activá post-loss protocol.';
    }
    return `Bloqueado: ${primaryReason?.title || 'condiciones de riesgo activas'}.`;
  }

  if (status === OPERATIONAL_STATUS.CAUTION) {
    if (primaryReason?.code === 'recent_loss') {
      return 'Precaución: pérdida reciente detectada. Evitá segunda operación impulsiva.';
    }
    if (primaryReason?.code === 'checklist_incomplete') {
      return 'Precaución: checklist incompleto. Completalo antes de validar una nueva entrada.';
    }
    if (primaryReason?.code === 'emotional_medium') {
      return 'Precaución: carga emocional moderada. Reducí riesgo.';
    }
    if (primaryReason?.code === 'near_max_trades') {
      return 'Precaución: cerca del máximo de trades del día.';
    }
    if (primaryReason?.code === 'daily_loss_partial') {
      return 'Precaución: pérdida diaria parcial relevante.';
    }
    return `Precaución: ${primaryReason?.title || 'condiciones de riesgo elevadas'}.`;
  }

  if (asArray(reasons).some(r => r.code === 'incomplete_data')) {
    return 'Apto con datos incompletos. Riesgo aparente bajo; completá inputs para mayor precisión.';
  }
  return 'Apto para operar con riesgo normal.';
}

function buildPublicInputs(normalized = {}, risk = {}) {
  return {
    dailyPnl: Number(normalized.dailyPnl || 0),
    weeklyPnl: Number(normalized.weeklyPnl || 0),
    dailyR: Number(normalized.dailyR || 0),
    weeklyR: Number(normalized.weeklyR || 0),
    tradesToday: Number(normalized.tradesToday || 0),
    maxTradesPerDay: Number(normalized.maxTradesPerDay || 0),
    dailyLossLimitHit: !!risk.dailyLossLimitHit,
    weeklyLossLimitHit: !!risk.weeklyLossLimitHit,
    drawdownLimitHit: !!risk.drawdownLimitHit,
    recentLoss: !!normalized.recentLoss,
    checklistComplete: normalized.checklistComplete !== false,
    emotionalRisk: normalized.emotionalRisk || 'unknown'
  };
}

/**
 * Unified operational state for cockpit consumers.
 *
 * @param {object} input
 * @param {array}  [input.trades]
 * @param {object} [input.riskSettings]
 * @param {object} [input.checklistState]
 * @param {object} [input.emotionalState]
 * @param {object} [input.emotionSignals] Sprint 06 compact emotional signals
 * @param {object} [input.account]
 * @param {Date|string|number} [input.now]
 * @returns {object} OperationalState contract
 */
export function buildOperationalState(input = {}) {
  try {
    const normalized = normalizeOperationalInputs(input);
    const risk = evaluateRiskLimits(normalized);
    const checklist = evaluateChecklistRisk(normalized);
    const emotional = evaluateEmotionalRisk(normalized);
    const reasons = buildOperationalReasons(normalized, { risk, checklist, emotional });
    const status = resolveStatus({ risk, checklist, emotional, normalized });
    const primaryReason = reasons.find(r => r.level === 'danger')
      || reasons.find(r => r.level === 'warning')
      || reasons[0]
      || {
        code: 'ok',
        level: 'info',
        title: 'Sin alertas activas',
        detail: 'Límites y señales dentro de parámetros.'
      };
    const actions = buildOperationalActions(status, reasons);
    const score = computeScore(status, reasons);

    return {
      status,
      label: OPERATIONAL_LABEL[status],
      severity: OPERATIONAL_SEVERITY[status],
      score,
      summary: buildSummary(status, primaryReason, reasons),
      primaryReason: primaryReason.title || primaryReason.detail || '',
      reasons,
      actions,
      inputs: buildPublicInputs(normalized, risk)
    };
  } catch {
    // Defensive fallback — never throw to UI consumers.
    return {
      status: OPERATIONAL_STATUS.CAUTION,
      label: OPERATIONAL_LABEL.caution,
      severity: OPERATIONAL_SEVERITY.caution,
      score: 55,
      summary: 'Precaución: no se pudo evaluar el estado completo. Datos incompletos.',
      primaryReason: 'Datos incompletos',
      reasons: [{
        code: 'incomplete_data',
        level: 'info',
        title: 'Datos incompletos',
        detail: 'Falló la evaluación de estado operativo. Se aplica precaución suave.',
        action: 'Revisar inputs de riesgo / trades / checklist.'
      }],
      actions: [{
        type: 'reduce-risk',
        label: 'Operar con precaución',
        detail: 'Estado no confiable. Evitá aumentar tamaño.'
      }],
      inputs: {
        dailyPnl: 0,
        weeklyPnl: 0,
        dailyR: 0,
        weeklyR: 0,
        tradesToday: 0,
        maxTradesPerDay: OPERATIONAL_DEFAULTS.maxTradesPerDay,
        dailyLossLimitHit: false,
        weeklyLossLimitHit: false,
        drawdownLimitHit: false,
        recentLoss: false,
        checklistComplete: true,
        emotionalRisk: 'unknown'
      }
    };
  }
}
