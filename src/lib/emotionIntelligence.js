/**
 * Sprint 06 — Emotion Intelligence Layer
 * Pure layer: emotion + behavior ↔ execution / risk signals.
 * No DOM, no Firebase, no side effects. Not a clinical diagnosis.
 */

import { getTradeOperationalDateKey, normalizeDateKey, tradingDayKey } from './dateUtils.js';
import { toNumberSafe, safeArray } from './tradeUtils.js';
import { tradeFollowedPlan, realizedRValue } from './analyticsUtils.js';

export const EMOTION_STATUS = Object.freeze({
  STABLE: 'stable',
  WATCH: 'watch',
  RISK: 'risk',
  UNKNOWN: 'unknown'
});

export const EMOTION_LABEL = Object.freeze({
  stable: 'Estable',
  watch: 'En observación',
  risk: 'Riesgo emocional',
  unknown: 'Sin datos'
});

export const EMOTION_SEVERITY = Object.freeze({
  stable: 'success',
  watch: 'warning',
  risk: 'danger',
  unknown: 'neutral'
});

export const EMOTION_STATES = Object.freeze([
  'calma',
  'ansiedad',
  'euforia',
  'frustración',
  'cansancio',
  'presión',
  'duda',
  'confianza',
  'desconocido'
]);

export const EMOTION_DEFAULTS = Object.freeze({
  highThreshold: 7,
  moderateThreshold: 5,
  lowClarityThreshold: 4,
  minCompareGroup: 3,
  minDirectiveSample: 5,
  anxietyHigh: 7,
  recoveryHigh: 7
});

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOrNull(value) {
  if (value == null || value === '') return null;
  if (value === true) return 1;
  if (value === false) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stripDiacritics(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

/** Normalize 1–10 scales; accept 0–1 fractions. Missing → null (never invent 0). */
export function normalizeScale10(value) {
  if (value == null || value === '') return null;
  const n = finiteOrNull(value);
  if (n == null) return null;
  // 0–1 fraction only when clearly fractional (e.g. 0.7); bare 0/1 stay as scale points.
  if (n > 0 && n < 1) return Math.round(n * 10 * 10) / 10;
  if (n < 0) return 0;
  if (n > 10) return 10;
  return Math.round(n * 10) / 10;
}

/**
 * Map free-form mood / emotion labels to consistent Spanish labels.
 */
export function normalizeEmotionLabel(value) {
  if (value == null || value === '') return 'desconocido';
  if (typeof value === 'boolean') return value ? 'ansiedad' : 'desconocido';
  const t = stripDiacritics(value);
  if (!t || t === 'unknown' || t === 'neutro' || t === 'neutral') return 'desconocido';

  if (/(calma|calmo|tranquilo|relajado|sereno|enfocado|focused)/.test(t)) return 'calma';
  if (/(ansied|ansioso|anxiety|nervios|apurado|rushed)/.test(t)) return 'ansiedad';
  if (/(eufor|euphor|sobreconfianza|overconfident)/.test(t)) return 'euforia';
  if (/(frustr|molest|enojad|angry|tilt)/.test(t)) return 'frustración';
  if (/(cansad|fatig|agotado|sueño|sleepy|tired)/.test(t)) return 'cansancio';
  if (/(presion|pressure|estres|stress)/.test(t)) return 'presión';
  if (/(duda|hesitat|insegu|uncertain)/.test(t)) return 'duda';
  if (/(confianza|confiad|confident)/.test(t)) return 'confianza';
  if (/(recuper|revenge|impulso|impuls)/.test(t)) return 'presión';

  return 'desconocido';
}

function pickFirst(...values) {
  for (const v of values) {
    if (v != null && v !== '') return v;
  }
  return null;
}

function parseBooleanLoose(value) {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return null;
  const t = stripDiacritics(value);
  if (['true', 'si', 'yes', '1', 'completo', 'ok', 'cumplido'].includes(t)) return true;
  if (['false', 'no', '0', 'incompleto', 'faltante'].includes(t)) return false;
  return null;
}

function parseRecoveryImpulse(value) {
  if (value == null || value === '') return null;
  if (value === true) return 8;
  if (value === false) return null;
  if (typeof value === 'string') {
    const t = stripDiacritics(value);
    if (!t) return null;
    if (/(revenge|recuper|tilt|impulso)/.test(t)) return 8;
    if (['false', 'no', '0'].includes(t)) return null;
  }
  return normalizeScale10(value);
}

function tradePnl(source = {}) {
  return toNumberSafe(source.resultMoney ?? source.pnl ?? source.profit ?? source.netPnl ?? source.pl);
}

function tradeR(source = {}) {
  const fromHelper = realizedRValue(source);
  if (Number.isFinite(fromHelper) && fromHelper !== 0) return fromHelper;
  const candidates = [source.r, source.rMultiple, source.rr, source.resultR];
  for (const c of candidates) {
    const n = finiteOrNull(typeof c === 'string' ? String(c).replace(',', '.') : c);
    if (n != null) return n;
  }
  return 0;
}

function tradeResultLabel(pnl, r) {
  if (pnl < 0 || r < 0) return 'loss';
  if (pnl > 0 || r > 0) return 'win';
  if (pnl === 0 && r === 0) return 'breakeven';
  return 'unknown';
}

function resolveRecordDate(source = {}, sourceType) {
  if (sourceType === 'trade') {
    return getTradeOperationalDateKey(source) || normalizeDateKey(source.date || source.createdAt) || null;
  }
  return (
    normalizeDateKey(source.date || source.tradingDay || source.timestamp || source.createdAt) ||
    null
  );
}

function hasEmotionalSignal(record) {
  if (!record) return false;
  return (
    (record.dominantState && record.dominantState !== 'desconocido') ||
    (record.emotionBefore && record.emotionBefore !== 'desconocido') ||
    (record.emotionAfter && record.emotionAfter !== 'desconocido') ||
    record.anxiety != null ||
    record.clarity != null ||
    record.confidence != null ||
    (record.recoveryImpulse != null && record.recoveryImpulse >= EMOTION_DEFAULTS.moderateThreshold) ||
    record.fomo === true ||
    record.fatigue === true ||
    record.hesitation === true
  );
}

function resolveFollowedPlan(source = {}, sourceType = null) {
  const direct = parseBooleanLoose(source.followedPlan ?? source.planFollowed);
  if (direct != null) return direct;
  // Only infer from trade behavior fields — never invent false for journals.
  if (sourceType === 'trade' && typeof tradeFollowedPlan === 'function') {
    const hasBehaviorEvidence =
      source.executionBehaviors != null ||
      source.postTradeBehavior != null;
    if (!hasBehaviorEvidence) return null;
    try {
      return tradeFollowedPlan(source);
    } catch {
      return null;
    }
  }
  return null;
}

function resolveChecklistComplete(source = {}, sourceType) {
  const fromFlag = parseBooleanLoose(source.checklistComplete ?? source.complete ?? source.finalGreen);
  if (fromFlag != null) return fromFlag;
  if (sourceType === 'checklist') {
    const score = finiteOrNull(source.score);
    if (score != null) return score >= 85;
  }
  if (Array.isArray(source.checklist) && source.checklist.length) return true;
  return null;
}

/**
 * Normalize trade / journal / checklist into a stable emotion record.
 * Never mutates the original source.
 */
export function normalizeEmotionRecord(source = {}, sourceHint = null) {
  const raw = asObject(source);
  let sourceType = sourceHint;
  if (!sourceType) {
    if (raw.source === 'trade' || raw.source === 'journal' || raw.source === 'checklist') {
      sourceType = raw.source;
    } else if (
      raw.resultMoney != null ||
      raw.resultR != null ||
      raw.emotionBefore != null ||
      raw.asset != null ||
      raw.side != null
    ) {
      sourceType = 'trade';
    } else if (
      raw.anxietyLevel != null ||
      raw.confidenceLevel != null ||
      raw.mood != null ||
      raw.feltRevengeImpulse != null ||
      raw.feltFomo != null ||
      raw.freeWriting != null
    ) {
      sourceType = 'journal';
    } else if (raw.finalGreen != null || raw.checklistItems != null || raw.score != null) {
      sourceType = 'checklist';
    } else {
      sourceType = 'journal';
    }
  }

  const anxiety = normalizeScale10(
    pickFirst(raw.anxiety, raw.anxietyLevel, raw.ansiedad)
  );
  const confidence = normalizeScale10(
    pickFirst(raw.confidence, raw.confidenceLevel, raw.confianza)
  );
  const clarity = normalizeScale10(
    pickFirst(raw.clarity, raw.clarityLevel, raw.clarityScore, confidence)
  );
  const recoveryImpulse = parseRecoveryImpulse(
    pickFirst(
      raw.recoveryImpulse,
      raw.recoveryImpulseLevel,
      raw.feltRevengeImpulse,
      raw.revenge,
      raw.revengeImpulse
    )
  );

  const emotionBefore = normalizeEmotionLabel(
    pickFirst(raw.emotionBefore, raw.estadoMental, raw.preEmotion)
  );
  const emotionAfter = normalizeEmotionLabel(pickFirst(raw.emotionAfter, raw.postEmotion));
  const dominantState = normalizeEmotionLabel(
    pickFirst(
      raw.dominantState,
      raw.state,
      raw.mood,
      raw.emotion,
      emotionBefore !== 'desconocido' ? emotionBefore : null,
      emotionAfter !== 'desconocido' ? emotionAfter : null
    )
  );

  const fomoRaw = pickFirst(raw.fomo, raw.feltFomo, raw.fomoRisk);
  let fomo = typeof fomoRaw === 'boolean' ? fomoRaw : parseBooleanLoose(fomoRaw);
  const fatigueRaw = pickFirst(raw.fatigue, raw.tired, raw.cansancio);
  let fatigue = typeof fatigueRaw === 'boolean' ? fatigueRaw : parseBooleanLoose(fatigueRaw);
  const energy = normalizeScale10(pickFirst(raw.energy, raw.energyLevel));
  const sleep = normalizeScale10(pickFirst(raw.sleepQuality, raw.sleep));
  if (fatigue == null && ((energy != null && energy <= 4) || (sleep != null && sleep <= 4) || dominantState === 'cansancio')) {
    fatigue = true;
  }

  const hesitationRaw = pickFirst(raw.hesitation, raw.duda);
  let hesitation = typeof hesitationRaw === 'boolean' ? hesitationRaw : parseBooleanLoose(hesitationRaw);
  if (hesitation == null && dominantState === 'duda') hesitation = true;

  const pnl = tradePnl(raw);
  const rMultiple = tradeR(raw);
  const date = resolveRecordDate(raw, sourceType);
  const disciplineScore = normalizeScale10(
    pickFirst(raw.disciplineScore, raw.discipline, raw.disciplineLevel)
  );

  return {
    id: raw.id ?? null,
    date,
    source: sourceType,
    dominantState,
    emotionBefore,
    emotionAfter,
    anxiety,
    clarity,
    confidence,
    recoveryImpulse,
    fomo: fomo == null ? null : fomo === true,
    fatigue: fatigue == null ? null : fatigue === true,
    hesitation: hesitation == null ? null : hesitation === true,
    followedPlan: resolveFollowedPlan(raw, sourceType),
    checklistComplete: resolveChecklistComplete(raw, sourceType),
    disciplineScore,
    mistakeType: raw.mistakeType ?? raw.postTradeBehavior ?? null,
    notes: pickFirst(raw.notes, raw.privateJournal, raw.lesson, raw.freeWriting, raw.notasComportamiento),
    pnl: Number.isFinite(pnl) ? pnl : 0,
    rMultiple: Number.isFinite(rMultiple) ? rMultiple : 0,
    result: tradeResultLabel(pnl, rMultiple),
    session: raw.session ?? null,
    setup: raw.setup ?? raw.pattern ?? null,
    postLoss: parseBooleanLoose(raw.postLoss) === true || raw.result === 'loss',
    _rawAnxietyTrade: raw.tradedFromAnxiety === true || raw.anxiousTrade === true
  };
}

function avg(values = []) {
  const nums = values.filter(v => Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

function pct(part, total) {
  if (!total) return null;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Emotional sample quality / progress toward reliable signal.
 */
export function buildEmotionSample(records = []) {
  const list = asArray(records).filter(Boolean);
  const tradesWithEmotion = list.filter(r => r.source === 'trade' && hasEmotionalSignal(r)).length;
  const journalEntries = list.filter(r => r.source === 'journal' && hasEmotionalSignal(r)).length;
  const checklistEmotional = list.filter(r => r.source === 'checklist' && hasEmotionalSignal(r)).length;
  const total = list.filter(hasEmotionalSignal).length;

  let quality = 'empty';
  if (total === 0) quality = 'empty';
  else if (total <= 4) quality = 'insufficient';
  else if (total <= 9) quality = 'observing';
  else if (total <= 19) quality = 'usable';
  else quality = 'reliable';

  const target = quality === 'reliable' ? 20 : quality === 'usable' ? 20 : quality === 'observing' ? 10 : 5;
  const progressPct = Math.min(100, Math.round((total / Math.max(target, 1)) * 100));

  const messages = {
    empty: 'Sin datos emocionales. Registrá check-in o emoción en trades para medir.' ,
    insufficient: 'Muestra insuficiente. Señal de hipótesis; medir próximos trades con check-in emocional.',
    observing: 'Señal en observación. Aún no confirmado; medir próximos 10 trades con emoción completa.',
    usable: 'Muestra usable. Las directivas tienen respaldo operativo moderado.',
    reliable: 'Muestra confiable. Patrones emocionales con respaldo suficiente para priorizar acciones.'
  };

  return {
    total,
    tradesWithEmotion,
    journalEntries,
    checklistEmotional,
    quality,
    message: messages[quality],
    progressPct
  };
}

function emotionBucketKey(record) {
  if (record.dominantState && record.dominantState !== 'desconocido') return record.dominantState;
  if (record.emotionBefore && record.emotionBefore !== 'desconocido') return record.emotionBefore;
  return 'desconocido';
}

function riskLevelForEmotionStats({ avgR, planCompliance, trades, anxietyAvg }) {
  if (trades < 3) return 'unknown';
  if ((avgR != null && avgR <= -0.3) || (planCompliance != null && planCompliance < 50) || (anxietyAvg != null && anxietyAvg >= 7)) {
    return 'high';
  }
  if ((avgR != null && avgR < 0.2) || (planCompliance != null && planCompliance < 70) || (anxietyAvg != null && anxietyAvg >= 5)) {
    return 'medium';
  }
  return 'low';
}

function insightForEmotion(emotion, stats, sampleQuality) {
  const soft = sampleQuality === 'empty' || sampleQuality === 'insufficient' || sampleQuality === 'observing';
  if (stats.trades < 2) {
    return soft
      ? `Señal en observación: pocos trades con ${emotion}.`
      : `Poca muestra en ${emotion}; seguir midiendo.`;
  }
  if (stats.avgR != null && stats.avgR >= 0.5 && stats.planCompliance != null && stats.planCompliance >= 70) {
    return soft
      ? `Hipótesis: ${emotion} aparece con mejor R. Aún no confirmado.`
      : `${emotion}: mejor ejecución relativa (+${stats.avgR.toFixed(2)}R avg).`;
  }
  if (stats.avgR != null && stats.avgR < 0) {
    return soft
      ? `Señal en observación: R promedio cae con ${emotion}.`
      : `${emotion} asociado a R promedio negativo (${stats.avgR.toFixed(2)}R).`;
  }
  return soft
    ? `Medir más trades en ${emotion} antes de afirmar patrón.`
    : `${emotion}: ${stats.trades} trades · ${stats.avgR != null ? `${stats.avgR.toFixed(2)}R avg` : 'sin R'}.`;
}

/**
 * Group performance metrics by dominant emotion.
 */
export function buildPerformanceByEmotion(records = [], sampleQuality = 'empty') {
  const tradeRecords = asArray(records).filter(r => r.source === 'trade');
  const groups = {};

  for (const r of tradeRecords) {
    if (!hasEmotionalSignal(r) && r.dominantState === 'desconocido') continue;
    const key = emotionBucketKey(r);
    if (!groups[key]) {
      groups[key] = {
        emotion: key,
        trades: 0,
        pnl: 0,
        rSum: 0,
        rCount: 0,
        wins: 0,
        decided: 0,
        planYes: 0,
        planKnown: 0,
        anxietySum: 0,
        anxietyCount: 0
      };
    }
    const g = groups[key];
    g.trades += 1;
    g.pnl += Number(r.pnl || 0);
    if (Number.isFinite(r.rMultiple)) {
      g.rSum += r.rMultiple;
      g.rCount += 1;
    }
    if (r.result === 'win' || r.result === 'loss') {
      g.decided += 1;
      if (r.result === 'win') g.wins += 1;
    }
    if (r.followedPlan === true || r.followedPlan === false) {
      g.planKnown += 1;
      if (r.followedPlan === true) g.planYes += 1;
    }
    if (r.anxiety != null) {
      g.anxietySum += r.anxiety;
      g.anxietyCount += 1;
    }
  }

  return Object.values(groups)
    .map(g => {
      const avgR = g.rCount ? Math.round((g.rSum / g.rCount) * 100) / 100 : null;
      const winrate = g.decided ? pct(g.wins, g.decided) : null;
      const planCompliance = g.planKnown ? pct(g.planYes, g.planKnown) : null;
      const anxietyAvg = g.anxietyCount ? g.anxietySum / g.anxietyCount : null;
      const stats = {
        emotion: g.emotion,
        trades: g.trades,
        pnl: Math.round(g.pnl * 100) / 100,
        avgR,
        winrate,
        planCompliance,
        riskLevel: riskLevelForEmotionStats({ avgR, planCompliance, trades: g.trades, anxietyAvg }),
        insight: ''
      };
      stats.insight = insightForEmotion(g.emotion, stats, sampleQuality);
      return stats;
    })
    .sort((a, b) => {
      if ((b.avgR ?? -999) !== (a.avgR ?? -999)) return (b.avgR ?? -999) - (a.avgR ?? -999);
      return b.trades - a.trades;
    });
}

function signalBase(active, level, metric, detail, confidence) {
  return {
    active: !!active,
    level: level || 'none',
    metric: metric || null,
    detail: detail || '',
    confidence: confidence || 'insufficient'
  };
}

function confidenceFromSample(sampleQuality, hardEnough) {
  if (sampleQuality === 'reliable' && hardEnough) return 'reliable';
  if (sampleQuality === 'usable' && hardEnough) return 'usable';
  if (sampleQuality === 'observing') return 'observing';
  return 'insufficient';
}

/**
 * High anxiety associated with worse avg R or plan compliance.
 */
export function detectAnxietyDrag(records = [], options = {}) {
  const highThr = options.anxietyHigh ?? EMOTION_DEFAULTS.anxietyHigh;
  const minGroup = options.minCompareGroup ?? EMOTION_DEFAULTS.minCompareGroup;
  const trades = asArray(records).filter(r => r.source === 'trade' && r.anxiety != null);
  const high = trades.filter(r => r.anxiety >= highThr);
  const rest = trades.filter(r => r.anxiety < highThr);

  if (high.length < minGroup || rest.length < minGroup) {
    const softActive = high.length > 0 && rest.length > 0;
    const highAvg = avg(high.map(r => r.rMultiple));
    const restAvg = avg(rest.map(r => r.rMultiple));
    return signalBase(
      softActive && highAvg != null && restAvg != null && highAvg < restAvg,
      softActive ? 'watch' : 'none',
      softActive && highAvg != null && restAvg != null
        ? `Ansiedad alta ${highAvg.toFixed(2)}R vs resto ${restAvg.toFixed(2)}R · n=${high.length}/${rest.length}`
        : `Ansiedad alta n=${high.length}`,
      softActive
        ? 'Señal en observación: ansiedad alta podría reducir R promedio. Aún no confirmado.'
        : 'Muestra insuficiente para comparar ansiedad alta vs resto.',
      'observing'
    );
  }

  const highAvgR = avg(high.map(r => r.rMultiple));
  const restAvgR = avg(rest.map(r => r.rMultiple));
  const highPlan = pct(high.filter(r => r.followedPlan === true).length, high.filter(r => r.followedPlan != null).length);
  const restPlan = pct(rest.filter(r => r.followedPlan === true).length, rest.filter(r => r.followedPlan != null).length);
  const dragR = highAvgR != null && restAvgR != null && highAvgR < restAvgR - 0.15;
  const dragPlan = highPlan != null && restPlan != null && highPlan < restPlan - 10;
  const active = dragR || dragPlan;

  return signalBase(
    active,
    active ? (highAvgR != null && highAvgR < 0 ? 'high' : 'medium') : 'low',
    `Ansiedad ≥${highThr}: ${highAvgR?.toFixed(2) ?? '—'}R · resto ${restAvgR?.toFixed(2) ?? '—'}R`,
    active
      ? 'Ansiedad alta se asocia con peor R promedio o menor cumplimiento del plan.'
      : 'No hay drag claro de ansiedad alta vs resto en la muestra actual.',
    confidenceFromSample(options.sampleQuality, true)
  );
}

function sortByDateAsc(records = []) {
  return [...asArray(records)].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

/**
 * Recovery impulse after losses / clustered trades.
 */
export function detectRecoveryRisk(records = [], options = {}) {
  const high = options.recoveryHigh ?? EMOTION_DEFAULTS.recoveryHigh;
  const list = sortByDateAsc(asArray(records));
  const trades = list.filter(r => r.source === 'trade');
  const highRecovery = list.filter(r => r.recoveryImpulse != null && r.recoveryImpulse >= high);
  const recentLosses = trades.filter(r => r.result === 'loss');

  let lossThenRecovery = 0;
  for (let i = 0; i < trades.length; i += 1) {
    if (trades[i].result !== 'loss') continue;
    const next = trades[i + 1];
    if (!next) continue;
    if (next.recoveryImpulse != null && next.recoveryImpulse >= high) lossThenRecovery += 1;
    else if (next.date === trades[i].date && trades.filter(t => t.date === trades[i].date).length >= 2) {
      lossThenRecovery += 1;
    }
  }

  const byDay = trades.reduce((acc, t) => {
    if (!t.date) return acc;
    acc[t.date] = (acc[t.date] || 0) + 1;
    return acc;
  }, {});
  const overtradeDays = Object.values(byDay).filter(n => n >= 3).length;

  const active =
    highRecovery.length > 0 &&
    (lossThenRecovery > 0 || recentLosses.length > 0 || overtradeDays > 0);

  const level = active
    ? (lossThenRecovery >= 2 || overtradeDays >= 2 ? 'high' : 'medium')
    : highRecovery.length
      ? 'watch'
      : 'none';

  return signalBase(
    active || highRecovery.length > 0,
    level,
    `Recovery alto: ${highRecovery.length} docs · post-pérdida: ${lossThenRecovery} · días ≥3 trades: ${overtradeDays}`,
    active
      ? 'Impulso de recuperar aparece junto a pérdida o clustering de trades.'
      : highRecovery.length
        ? 'Señal en observación: hay impulso de recuperar registrado; medir contexto post-pérdida.'
        : 'Sin impulso de recuperar relevante en la muestra.',
    confidenceFromSample(options.sampleQuality, lossThenRecovery + highRecovery.length >= 3)
  );
}

/**
 * Post-loss pattern: plan breaks, more trades, worse R, elevated emotion.
 */
export function detectPostLossRisk(records = [], options = {}) {
  const trades = sortByDateAsc(asArray(records).filter(r => r.source === 'trade'));
  const windows = [];

  for (let i = 0; i < trades.length; i += 1) {
    if (trades[i].result !== 'loss') continue;
    const lossDate = trades[i].date;
    const after = trades.slice(i + 1, i + 4);
    if (!after.length) continue;
    const sameDayAfter = after.filter(t => t.date === lossDate);
    const window = sameDayAfter.length ? sameDayAfter : after.slice(0, 2);
    const planBreaks = window.filter(t => t.followedPlan === false).length;
    const avgRAfter = avg(window.map(t => t.rMultiple));
    const elevated = window.some(t =>
      t.anxiety >= EMOTION_DEFAULTS.anxietyHigh ||
      ['frustración', 'presión', 'ansiedad', 'euforia'].includes(t.dominantState) ||
      (t.recoveryImpulse != null && t.recoveryImpulse >= EMOTION_DEFAULTS.recoveryHigh)
    );
    windows.push({
      tradesAfter: window.length,
      planBreaks,
      avgRAfter,
      elevated,
      clustered: window.length >= 2
    });
  }

  if (!windows.length) {
    return signalBase(false, 'none', null, 'Sin secuencias post-pérdida evaluables.', 'insufficient');
  }

  const bad = windows.filter(w =>
    w.planBreaks > 0 ||
    (w.avgRAfter != null && w.avgRAfter < 0) ||
    w.elevated ||
    w.clustered
  );
  const active = bad.length > 0;
  const ratio = bad.length / windows.length;

  return signalBase(
    active,
    ratio >= 0.5 ? 'high' : active ? 'medium' : 'low',
    `Post-pérdida: ${bad.length}/${windows.length} ventanas con deterioro`,
    active
      ? 'Después de pérdida aparece baja de plan, más trades, peor R o emoción elevada.'
      : 'Las ventanas post-pérdida no muestran deterioro claro.',
    confidenceFromSample(options.sampleQuality, windows.length >= 3)
  );
}

export function detectFomoRisk(records = [], options = {}) {
  const list = asArray(records);
  const hits = list.filter(r => {
    if (r.fomo === true) return true;
    const mistake = stripDiacritics(r.mistakeType);
    const notes = stripDiacritics(r.notes);
    return /(fomo|revenge|chase|corrido atras|oper[eé] por impulso)/.test(mistake)
      || /\bfomo\b/.test(notes)
      || /por impulso/.test(notes);
  });

  return signalBase(
    hits.length > 0,
    hits.length >= 3 ? 'high' : hits.length ? 'medium' : 'none',
    hits.length ? `FOMO/impulse: ${hits.length} registros` : null,
    hits.length
      ? 'Señales de FOMO o entrada impulsiva en registros/notas.'
      : 'Sin FOMO explícito en la muestra.',
    confidenceFromSample(options.sampleQuality, hits.length >= 3)
  );
}

export function detectFatigueRisk(records = [], options = {}) {
  const list = asArray(records);
  const hits = list.filter(r =>
    r.fatigue === true ||
    r.dominantState === 'cansancio' ||
    r.emotionBefore === 'cansancio' ||
    r.emotionAfter === 'cansancio'
  );

  return signalBase(
    hits.length > 0,
    hits.length >= 3 ? 'medium' : hits.length ? 'watch' : 'none',
    hits.length ? `Fatiga/claridad baja: ${hits.length}` : null,
    hits.length
      ? 'Cansancio o energía/claridad baja registradas. Riesgo de ejecución irregular.'
      : 'Sin señal clara de fatiga.',
    confidenceFromSample(options.sampleQuality, hits.length >= 3)
  );
}

export function detectHesitationRisk(records = [], options = {}) {
  const list = asArray(records);
  const hits = list.filter(r =>
    r.hesitation === true ||
    r.dominantState === 'duda' ||
    stripDiacritics(r.mistakeType).includes('dud')
  );
  const tradeHits = hits.filter(r => r.source === 'trade');
  const avgR = avg(tradeHits.map(r => r.rMultiple));

  return signalBase(
    hits.length > 0,
    avgR != null && avgR < 0 ? 'medium' : hits.length ? 'watch' : 'none',
    hits.length ? `Duda/hesitation: ${hits.length}${avgR != null ? ` · ${avgR.toFixed(2)}R` : ''}` : null,
    hits.length
      ? 'Aparece duda/hesitation en el ciclo de entrada.'
      : 'Sin señal de hesitation.',
    confidenceFromSample(options.sampleQuality, hits.length >= 3)
  );
}

export function detectPlanBreakRisk(records = [], options = {}) {
  const list = asArray(records);
  const breaks = list.filter(r => {
    if (r.followedPlan === false) return true;
    if (r.checklistComplete === false) return true;
    if (r.disciplineScore != null && r.disciplineScore <= 4) return true;
    const mistake = stripDiacritics(r.mistakeType);
    return /(impuls|revenge|fomo|romp|reglas|sobreoper)/.test(mistake);
  });

  const withLoss = breaks.filter(r => r.result === 'loss' || r.postLoss === true);
  const level = withLoss.length ? 'high' : breaks.length >= 3 ? 'medium' : breaks.length ? 'watch' : 'none';

  return signalBase(
    breaks.length > 0,
    level,
    breaks.length ? `Plan/checklist rotos: ${breaks.length}${withLoss.length ? ` · con pérdida: ${withLoss.length}` : ''}` : null,
    breaks.length
      ? 'Ruptura de plan, checklist incompleto o disciplina baja detectada.'
      : 'Sin ruptura de plan relevante.',
    confidenceFromSample(options.sampleScore || options.sampleQuality, breaks.length >= 3)
  );
}

export function detectChecklistMismatch(records = [], options = {}) {
  const list = asArray(records);
  const mismatch = list.filter(r => {
    const elevated =
      (r.anxiety != null && r.anxiety >= EMOTION_DEFAULTS.anxietyHigh) ||
      (r.recoveryImpulse != null && r.recoveryImpulse >= EMOTION_DEFAULTS.recoveryHigh) ||
      ['ansiedad', 'euforia', 'frustración', 'presión'].includes(r.dominantState);
    return elevated && r.checklistComplete === false;
  });

  return signalBase(
    mismatch.length > 0,
    mismatch.length ? 'high' : 'none',
    mismatch.length ? `Checklist incompleto + emoción elevada: ${mismatch.length}` : null,
    mismatch.length
      ? 'Checklist incompleto con emoción elevada aumenta riesgo operativo.'
      : 'Sin mismatch checklist/emoción detectado.',
    confidenceFromSample(options.sampleQuality, mismatch.length >= 2)
  );
}

function buildEmotionalProfile(records = []) {
  const emotional = asArray(records).filter(hasEmotionalSignal);
  const counts = {};
  for (const r of emotional) {
    const key = emotionBucketKey(r);
    counts[key] = (counts[key] || 0) + 1;
  }
  const dominantState = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'desconocido';

  const byEmotion = buildPerformanceByEmotion(emotional, 'usable');
  const scored = byEmotion.filter(e => e.emotion !== 'desconocido' && e.trades >= 2 && e.avgR != null);
  const bestState = scored.length ? scored[0].emotion : null;
  const worstState = scored.length ? scored[scored.length - 1].emotion : null;

  return {
    dominantState,
    bestState,
    worstState,
    avgAnxiety: avg(emotional.map(r => r.anxiety).filter(v => v != null)),
    avgClarity: avg(emotional.map(r => r.clarity).filter(v => v != null)),
    avgConfidence: avg(emotional.map(r => r.confidence).filter(v => v != null)),
    avgRecoveryImpulse: avg(emotional.map(r => r.recoveryImpulse).filter(v => v != null)),
    sampleSize: emotional.length
  };
}

/**
 * Build actionable emotion directives (protect / reduce / repeat / investigate).
 */
export function buildEmotionDirectives(signals = {}, sample = {}, context = {}) {
  const quality = sample.quality || 'empty';
  const soft = quality === 'empty' || quality === 'insufficient' || quality === 'observing';
  const directives = [];
  const conf = soft ? 'observing' : quality === 'reliable' ? 'reliable' : 'usable';

  const push = d => {
    if (!d?.type || !d?.title) return;
    if (directives.some(x => x.title === d.title)) return;
    directives.push(d);
  };

  if (quality === 'empty' || quality === 'insufficient') {
    push({
      type: 'investigate',
      title: 'Medir check-in emocional',
      reason: sample.message || 'Sin muestra emocional suficiente.',
      metric: `${sample.total || 0} registros`,
      action: 'Medir próximos 10 trades con check-in emocional completo.',
      confidence: 'insufficient'
    });
  }

  if (
    signals.checklistMismatch?.active ||
    (signals.planBreakRisk?.active &&
      signals.planBreakRisk.level === 'high' &&
      quality !== 'empty' &&
      quality !== 'insufficient')
  ) {
    push({
      type: 'protect',
      title: 'Proteger: checklist antes de re-entrar',
      reason: 'Checklist incompleto o ruptura de plan con carga emocional eleva el riesgo operativo.',
      metric: signals.checklistMismatch?.metric || signals.planBreakRisk?.metric || 'plan/checklist',
      action: 'No validar entrada hasta checklist completo y re-check emocional.',
      confidence: conf
    });
  }

  if (
    (signals.recoveryRisk?.active && signals.recoveryRisk.level !== 'none') ||
    signals.postLossRisk?.level === 'high'
  ) {
    push({
      type: 'protect',
      title: 'Activar protocolo post-pérdida',
      reason: 'La combinación pérdida reciente + impulso de recuperar aumenta el riesgo operativo.',
      metric: signals.recoveryRisk?.metric || signals.postLossRisk?.metric || 'post-loss',
      action: 'Pausar y completar post-loss protocol antes de validar otro trade.',
      confidence: conf
    });
  }

  if (signals.anxietyDrag?.active) {
    push({
      type: soft ? 'investigate' : 'reduce',
      title: soft ? 'Medir drag de ansiedad' : 'Reducir tamaño con ansiedad alta',
      reason: signals.anxietyDrag.detail,
      metric: signals.anxietyDrag.metric,
      action: soft
        ? 'Medir próximos 10 trades con ansiedad y R registrados.'
        : 'Si ansiedad ≥7, reducir riesgo o no operar hasta claridad ≥7.',
      confidence: soft ? 'observing' : conf
    });
  }

  if (signals.fomoRisk?.active) {
    push({
      type: 'reduce',
      title: 'Recortar FOMO / chase',
      reason: signals.fomoRisk.detail,
      metric: signals.fomoRisk.metric,
      action: 'Exigir checklist A+ y tamaño reducido cuando aparezca FOMO.',
      confidence: conf
    });
  }

  if (signals.fatigueRisk?.active) {
    push({
      type: 'reduce',
      title: 'Recortar sesión por fatiga',
      reason: signals.fatigueRisk.detail,
      metric: signals.fatigueRisk.metric,
      action: 'Limitar trades del día o pausar si claridad ≤4.',
      confidence: conf
    });
  }

  const best = context.bestPerformance;
  if (best && best.avgR != null && best.avgR >= 0.4 && best.trades >= 3 && ['calma', 'confianza'].includes(best.emotion)) {
    push({
      type: 'repeat',
      title: `Repetir estado de ${best.emotion}`,
      reason: soft
        ? `Hipótesis: mejores ejecuciones aparecen con ${best.emotion}. Aún no confirmado.`
        : `Tus mejores ejecuciones aparecen cuando registrás ${best.emotion} y claridad alta.`,
      metric: `${best.avgR >= 0 ? '+' : ''}${best.avgR.toFixed(1)}R avg · ${best.trades} trades`,
      action: 'Operar solo si claridad ≥7 y ansiedad ≤5 durante la próxima semana.',
      confidence: soft ? 'observing' : conf
    });
  }

  if (signals.hesitationRisk?.active && !soft && quality !== 'empty') {
    push({
      type: 'investigate',
      title: 'Investigar hesitation en entradas',
      reason: signals.hesitationRisk.detail,
      metric: signals.hesitationRisk.metric,
      action: 'Revisar si duda aparece en setup inválido o en ejecución A+.',
      confidence: conf
    });
  }

  return directives.slice(0, 5);
}

/**
 * Current-day emotional snapshot only.
 * Never falls back to historical journals/trades for operational gating.
 */
function currentEmotionalSnapshot(records = [], now) {
  const dayKey = tradingDayKey(resolveNow(now));
  const todayEmotional = asArray(records)
    .filter(r => hasEmotionalSignal(r) && r.date === dayKey)
    .sort((a, b) => {
      const sourceRank = (s) => (s === 'journal' ? 3 : s === 'trade' ? 2 : 1);
      const bySource = sourceRank(b.source) - sourceRank(a.source);
      if (bySource) return bySource;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  return {
    current: todayEmotional[0] || null,
    dayKey,
    todayCount: todayEmotional.length
  };
}

function emptyCurrentOperationalSignals(reason, dayKey = null) {
  return {
    emotionalRisk: 'unknown',
    anxiety: null,
    recoveryImpulse: null,
    clarity: null,
    dominantState: 'desconocido',
    recentEmotionalState: 'desconocido',
    postLossProtocolRequired: false,
    shouldBlockTrading: false,
    shouldReduceRisk: false,
    reason,
    isCurrent: false,
    source: null,
    sourceDate: dayKey
  };
}

/**
 * Compact CURRENT signal for buildOperationalState / cockpit.
 * Historical behaviorSignals / profile averages must NOT gate trading.
 * Only today's check-in (or today's loss + today's elevated emotion) can block.
 */
export function buildOperationalEmotionSignals(intelligence = {}, options = {}) {
  const records = asArray(options.records);
  const now = resolveNow(options.now);
  const { current, dayKey } = currentEmotionalSnapshot(records, now);

  const todayTrades = records.filter(r => r.source === 'trade' && r.date === dayKey);
  // Only losses from the current trading day — ignore options.recentLoss historical bleed.
  const todayLoss = todayTrades.some(r => r.result === 'loss');

  const todayChecklists = records.filter(r => r.source === 'checklist' && r.date === dayKey);
  const checklistIncompleteToday = todayChecklists.some(c => c.checklistComplete === false);

  // No current emotional check-in → never block/reduce from emotion layer.
  if (!current) {
    return emptyCurrentOperationalSignals(
      todayLoss
        ? 'Pérdida del día sin check-in emocional actual. Sin bloqueo emocional.'
        : 'Sin check-in emocional de la jornada actual.',
      dayKey
    );
  }

  const anxiety = current.anxiety ?? null;
  const clarity = current.clarity ?? null;
  const recoveryImpulse = current.recoveryImpulse ?? null;
  const dominantState = current.dominantState || 'desconocido';
  const recoveryHigh = recoveryImpulse != null && recoveryImpulse >= EMOTION_DEFAULTS.recoveryHigh;
  const anxietyHigh = anxiety != null && anxiety >= EMOTION_DEFAULTS.anxietyHigh;
  const clarityLow = clarity != null && clarity <= EMOTION_DEFAULTS.lowClarityThreshold;
  const elevatedNow = anxietyHigh || recoveryHigh;

  const postLossProtocolRequired = todayLoss && elevatedNow;
  const checklistEmotionBlock = checklistIncompleteToday && elevatedNow;

  let emotionalRisk = 'low';
  if (postLossProtocolRequired || checklistEmotionBlock || (anxietyHigh && todayLoss) || (recoveryHigh && todayLoss)) {
    emotionalRisk = 'high';
  } else if (anxietyHigh || recoveryHigh || clarityLow || current.fomo === true) {
    emotionalRisk = 'medium';
  }

  const shouldBlockTrading =
    postLossProtocolRequired ||
    checklistEmotionBlock ||
    (anxietyHigh && todayLoss) ||
    (recoveryHigh && todayLoss);

  const shouldReduceRisk =
    !shouldBlockTrading &&
    (emotionalRisk === 'medium' || clarityLow || current.fomo === true || current.fatigue === true);

  let reason = 'Estado emocional de la jornada estable para operar con plan.';
  if (shouldBlockTrading && todayLoss && recoveryHigh) {
    reason = 'Bloqueado: pérdida de hoy + impulso de recuperar alto.';
  } else if (shouldBlockTrading && todayLoss && anxietyHigh) {
    reason = 'Bloqueado: pérdida de hoy + ansiedad alta en check-in actual.';
  } else if (shouldBlockTrading && checklistEmotionBlock) {
    reason = 'Bloqueado: checklist de hoy incompleto + emoción elevada.';
  } else if (shouldBlockTrading) {
    reason = 'Bloqueado: riesgo emocional alto en la jornada actual.';
  } else if (shouldReduceRisk && anxietyHigh) {
    reason = 'Precaución: ansiedad alta en check-in de hoy. Reducí riesgo o pausá.';
  } else if (shouldReduceRisk && clarityLow) {
    reason = 'Precaución: claridad baja en check-in de hoy. Reducí riesgo.';
  } else if (shouldReduceRisk) {
    reason = 'Precaución: señal emocional de la jornada elevada. Reducí riesgo.';
  }

  return {
    emotionalRisk,
    anxiety,
    recoveryImpulse,
    clarity,
    dominantState,
    recentEmotionalState: dominantState,
    postLossProtocolRequired: !!postLossProtocolRequired,
    shouldBlockTrading: !!shouldBlockTrading,
    shouldReduceRisk: !!shouldReduceRisk,
    reason,
    isCurrent: true,
    source: current.source || 'journal',
    sourceDate: current.date || dayKey
  };
}

function resolveOverallStatus(sample, operationalSignals, directives, behaviorSignals = {}) {
  if (sample.quality === 'empty') {
    return {
      status: EMOTION_STATUS.UNKNOWN,
      label: EMOTION_LABEL.unknown,
      severity: EMOTION_SEVERITY.unknown,
      score: 0
    };
  }

  // RISK only from CURRENT operational signals — never from historical aggregates.
  if (
    operationalSignals.isCurrent &&
    (operationalSignals.shouldBlockTrading || operationalSignals.emotionalRisk === 'high')
  ) {
    return {
      status: EMOTION_STATUS.RISK,
      label: EMOTION_LABEL.risk,
      severity: EMOTION_SEVERITY.risk,
      score: Math.max(10, 35 - (directives.filter(d => d.type === 'protect').length * 5))
    };
  }

  const historicalWatch =
    behaviorSignals.anxietyDrag?.active ||
    behaviorSignals.recoveryRisk?.active ||
    behaviorSignals.postLossRisk?.active ||
    behaviorSignals.fomoRisk?.active ||
    behaviorSignals.planBreakRisk?.level === 'high';

  if (
    sample.quality === 'insufficient' ||
    sample.quality === 'observing' ||
    (operationalSignals.isCurrent && operationalSignals.shouldReduceRisk) ||
    (operationalSignals.isCurrent && operationalSignals.emotionalRisk === 'medium') ||
    historicalWatch
  ) {
    return {
      status: EMOTION_STATUS.WATCH,
      label: EMOTION_LABEL.watch,
      severity: EMOTION_SEVERITY.watch,
      score: sample.quality === 'insufficient' ? 45 : 58
    };
  }

  return {
    status: EMOTION_STATUS.STABLE,
    label: EMOTION_LABEL.stable,
    severity: EMOTION_SEVERITY.stable,
    score: sample.quality === 'reliable' ? 88 : 76
  };
}

function buildSummary({ status, sample, profile, primaryPattern, primaryRisk, operationalSignals }) {
  if (status === EMOTION_STATUS.UNKNOWN) {
    return 'Sin datos emocionales. Medí check-in para conectar estado con ejecución.';
  }
  if (status === EMOTION_STATUS.RISK) {
    return operationalSignals.reason || `Riesgo emocional: ${primaryRisk}`;
  }
  if (status === EMOTION_STATUS.WATCH) {
    if (sample.quality === 'insufficient' || sample.quality === 'observing') {
      return `Señal en observación: ${primaryPattern}. ${sample.message}`;
    }
    return operationalSignals.reason || `En observación: ${primaryPattern}`;
  }
  if (profile.bestState) {
    return `Estable: mejor ejecución asociada a ${profile.bestState}. Mantener filtro de estado.`;
  }
  return 'Estado emocional estable respecto a la muestra actual.';
}

/**
 * Main API — Emotion Intelligence Layer.
 *
 * @param {object} input
 * @param {array} [input.trades]
 * @param {array} [input.emotionalJournals]
 * @param {array} [input.checklistEntries]
 * @param {Date|string|number} [input.now]
 * @param {object} [input.options]
 */
export function buildEmotionIntelligence(input = {}) {
  try {
    const raw = asObject(input);
    const options = asObject(raw.options);
    const now = resolveNow(raw.now);

    const tradeRecords = asArray(raw.trades).map(t => normalizeEmotionRecord(t, 'trade'));
    const journalRecords = asArray(raw.emotionalJournals || raw.journals || raw.emotional).map(j =>
      normalizeEmotionRecord(j, 'journal')
    );
    const checklistRecords = asArray(raw.checklistEntries || raw.checklists).map(c =>
      normalizeEmotionRecord(c, 'checklist')
    );
    const records = [...tradeRecords, ...journalRecords, ...checklistRecords];

    const sample = buildEmotionSample(records);
    const performanceByEmotion = buildPerformanceByEmotion(records, sample.quality);
    const profile = buildEmotionalProfile(records);

    const signalOpts = { sampleQuality: sample.quality, ...options };
    const behaviorSignals = {
      anxietyDrag: detectAnxietyDrag(records, signalOpts),
      recoveryRisk: detectRecoveryRisk(records, signalOpts),
      postLossRisk: detectPostLossRisk(records, signalOpts),
      fomoRisk: detectFomoRisk(records, signalOpts),
      fatigueRisk: detectFatigueRisk(records, signalOpts),
      hesitationRisk: detectHesitationRisk(records, signalOpts),
      planBreakRisk: detectPlanBreakRisk(records, signalOpts),
      checklistMismatch: detectChecklistMismatch(records, signalOpts)
    };

    const bestPerformance = performanceByEmotion.find(
      e => e.emotion != null && e.emotion !== 'desconocido' && e.avgR != null
    ) || null;

    const directives = buildEmotionDirectives(behaviorSignals, sample, { bestPerformance, profile });

    const operationalSignals = buildOperationalEmotionSignals(
      { emotionalProfile: profile, behaviorSignals, sample },
      { records, now }
    );

    const primaryPattern =
      (behaviorSignals.anxietyDrag.active && 'Ansiedad asociada a peor R') ||
      (behaviorSignals.recoveryRisk.active && 'Impulso de recuperar post-pérdida') ||
      (behaviorSignals.postLossRisk.active && 'Deterioro post-pérdida') ||
      (behaviorSignals.checklistMismatch.active && 'Checklist incompleto + emoción elevada') ||
      (behaviorSignals.fomoRisk.active && 'FOMO / chase') ||
      (profile.worstState && profile.worstState !== 'desconocido' && `Peor ejecución en ${profile.worstState}`) ||
      (profile.dominantState !== 'desconocido' && `Estado dominante: ${profile.dominantState}`) ||
      'Sin patrón emocional dominante';

    // primaryRisk for cockpit prefers CURRENT operational reason; historical stays analytical.
    const primaryRisk = operationalSignals.isCurrent
      ? (operationalSignals.reason ||
        (behaviorSignals.recoveryRisk.active && behaviorSignals.recoveryRisk.detail) ||
        (behaviorSignals.anxietyDrag.active && behaviorSignals.anxietyDrag.detail) ||
        sample.message)
      : (sample.message ||
        (behaviorSignals.anxietyDrag.active && `${behaviorSignals.anxietyDrag.detail} (histórico)`) ||
        (behaviorSignals.recoveryRisk.active && `${behaviorSignals.recoveryRisk.detail} (histórico)`) ||
        'Sin check-in emocional de la jornada actual.');

    const overall = resolveOverallStatus(sample, operationalSignals, directives, behaviorSignals);
    const summary = buildSummary({
      status: overall.status,
      sample,
      profile,
      primaryPattern,
      primaryRisk,
      operationalSignals
    });

    return {
      status: overall.status,
      label: overall.label,
      severity: overall.severity,
      score: overall.score,
      summary,
      primaryPattern,
      primaryRisk,
      emotionalProfile: profile,
      performanceByEmotion,
      behaviorSignals,
      directives,
      operationalSignals,
      sample: {
        tradesWithEmotion: sample.tradesWithEmotion,
        journalEntries: sample.journalEntries,
        quality: sample.quality,
        message: sample.message,
        progressPct: sample.progressPct,
        total: sample.total
      }
    };
  } catch {
    return {
      status: EMOTION_STATUS.UNKNOWN,
      label: EMOTION_LABEL.unknown,
      severity: EMOTION_SEVERITY.unknown,
      score: 0,
      summary: 'Sin datos emocionales confiables. Reintentá con check-ins válidos.',
      primaryPattern: 'Sin patrón emocional dominante',
      primaryRisk: 'Datos emocionales incompletos',
      emotionalProfile: {
        dominantState: 'desconocido',
        bestState: null,
        worstState: null,
        avgAnxiety: null,
        avgClarity: null,
        avgConfidence: null,
        avgRecoveryImpulse: null,
        sampleSize: 0
      },
      performanceByEmotion: [],
      behaviorSignals: {
        anxietyDrag: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        recoveryRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        postLossRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        fomoRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        fatigueRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        hesitationRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        planBreakRisk: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient'),
        checklistMismatch: signalBase(false, 'none', null, 'Sin evaluación.', 'insufficient')
      },
      directives: [{
        type: 'investigate',
        title: 'Medir check-in emocional',
        reason: 'No se pudo construir la capa emocional.',
        metric: '0 registros',
        action: 'Medir próximos 10 trades con check-in emocional completo.',
        confidence: 'insufficient'
      }],
      operationalSignals: {
        emotionalRisk: 'unknown',
        anxiety: null,
        recoveryImpulse: null,
        clarity: null,
        dominantState: 'desconocido',
        recentEmotionalState: 'desconocido',
        postLossProtocolRequired: false,
        shouldBlockTrading: false,
        shouldReduceRisk: false,
        reason: 'Sin señal emocional dominante.',
        isCurrent: false,
        source: null,
        sourceDate: null
      },
      sample: {
        tradesWithEmotion: 0,
        journalEntries: 0,
        quality: 'empty',
        message: 'Sin datos emocionales. Registrá check-in o emoción en trades para medir.',
        progressPct: 0,
        total: 0
      }
    };
  }
}
