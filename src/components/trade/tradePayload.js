import { tradingDayKey } from '../../lib/dateUtils.js';
import { toNumberSafe, normalizeTradeArrayFields, normalizeTradeSetup, sanitizeFirestoreObject } from '../../lib/tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from '../../lib/analyticsUtils.js';

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
  if (!form.mentorReviewRequested) return {};
  return {
    mentorReviewRequested: true,
    mentorReviewStatus: form.mentorReviewStatus || 'pending',
    mentorReviewRequestedBy: profileUid,
    mentorReviewRequestedAt: form.mentorReviewRequestedAt || new Date().toISOString()
  };
}

export function buildTradeSavePayload({ form, profile, selectedAccountValue, captureUrl = '', reviewPatch = {} }) {
  const payload = numericTradePayload({
    ...form,
    account: selectedAccountValue,
    ...reviewPatch,
    tradeSystem: form.tradeSystem || 'Sistema de Moisés',
    system: form.tradeSystem || 'Sistema de Moisés',
    setup: form.setup || normalizeTradeSetup(form)
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
