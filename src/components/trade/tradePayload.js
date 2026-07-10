import { tradingDayKey } from '../../lib/dateUtils.js';
import { toNumberSafe, normalizeTradeArrayFields, normalizeTradeSetup, sanitizeFirestoreObject } from '../../lib/tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from '../../lib/analyticsUtils.js';
import { resolveChecklistQualityFields } from './tradeFormSteps.js';

export function numericTradePayload(form) {
  const numeric = ['riskPct', 'entry', 'sl', 'tp', 'exit', 'riskMoney', 'resultMoney', 'resultPct', 'resultR'];
  const out = normalizeTradeArrayFields({ ...form });
  numeric.forEach(k => { out[k] = toNumberSafe(out[k]); });
  ['calidadTesis', 'calidadEjecucion', 'calidadComportamiento', 'calidadRevision', 'indiceCalidadContextual'].forEach(k => {
    const raw = String(out[k] ?? '').trim();
    out[k] = raw === '' ? undefined : Math.max(1, Math.min(10, Math.round(toNumberSafe(raw))));
  });
  out.behaviorScore = behaviorScoreFromTrade(out);
  out.behaviorScoreLabel = behaviorScoreLabel(out.behaviorScore);
  return out;
}

export function buildMentorReviewPatch(form = {}, profileUid = '') {
  if (!form.mentorReviewRequested) {
    return {
      mentorReviewRequested: false,
      mentorReviewStatus: null,
      mentorReviewRequestedBy: null,
      mentorReviewRequestedAt: null,
      mentorReviewFocus: null,
      mentorReviewNote: null
    };
  }
  return {
    mentorReviewRequested: true,
    mentorReviewStatus: form.mentorReviewStatus || 'pending',
    mentorReviewRequestedBy: profileUid,
    mentorReviewRequestedAt: form.mentorReviewRequestedAt || new Date().toISOString(),
    mentorReviewFocus: form.mentorReviewFocus || 'general',
    mentorReviewNote: form.mentorReviewNote || ''
  };
}

export function buildTradeSavePayload({ form, profile, selectedAccountValue, captureUrl = '', reviewPatch = {} }) {
  const asset = String(form.asset || form.symbol || '').trim() || 'Sin activo';
  const accountName = selectedAccountValue || form.account || form.accountName || 'Cuenta principal';
  const notes = form.notes || form.lesson || form.privateJournal || '';
  const checklistQuality = resolveChecklistQualityFields(form);
  const payload = numericTradePayload({
    ...form,
    account: accountName,
    accountName,
    asset,
    symbol: form.symbol || asset,
    ...reviewPatch,
    tradeSystem: form.tradeSystem || 'Sistema de Moisés',
    system: form.tradeSystem || 'Sistema de Moisés',
    setup: form.setup || normalizeTradeSetup(form),
    // Decision Intelligence aliases (optional / defensive — do not drop legacy fields)
    planFollowed: form.planFollowed ?? form.followedPlan,
    followedPlan: form.followedPlan,
    followedPlanLabel: form.followedPlanLabel || undefined,
    checklistComplete: checklistQuality.checklistComplete,
    checklistLinked: checklistQuality.checklistLinked,
    preTradeValidation: checklistQuality.preTradeValidation,
    dataQualityFlags: checklistQuality.dataQualityFlags,
    mistakeType: form.mistakeType || form.postTradeBehavior || undefined,
    executionQuality: form.executionQuality || form.postTradeBehavior || undefined,
    notes,
    lesson: form.lesson || notes,
    emotionBefore: form.emotionBefore || form.estadoMental || '',
    emotionAfter: form.emotionAfter || '',
    anxiety: form.anxiety ?? form.anxietyLevel ?? undefined,
    confidence: form.confidence ?? form.confidenceLevel ?? undefined,
    clarity: form.clarity ?? undefined,
    recoveryImpulse: form.recoveryImpulse ?? form.feltRevengeImpulse ?? undefined,
    stopLoss: form.stopLoss ?? form.sl,
    takeProfit: form.takeProfit ?? form.tp,
    rMultiple: form.rMultiple ?? form.resultR,
    entry: form.entry,
    exit: form.exit,
    sl: form.sl ?? form.stopLoss,
    tp: form.tp ?? form.takeProfit
  });
  return payload;
}

export function buildTradeFirestoreDocument({ payload, profile, captureUrl = '', updatedAt }) {
  return sanitizeFirestoreObject({
    ...payload,
    captureUrl,
    tradingDay: payload.tradingDay || payload.date || tradingDayKey(),
    date: payload.date || payload.tradingDay || tradingDayKey(),
    userId: profile.uid,
    uid: profile.uid,
    ownerId: profile.uid,
    updatedAt
  });
}
