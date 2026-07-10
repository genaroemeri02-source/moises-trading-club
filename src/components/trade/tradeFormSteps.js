/** Sprint 12 — Trade Form stepped capture helpers (pure). */

export const TRADE_FORM_STEPS = [
  { id: 'result', label: 'Resultado' },
  { id: 'setup', label: 'Setup' },
  { id: 'behavior', label: 'Conducta' },
  { id: 'evidence', label: 'Evidencia' }
];

export const FOLLOWED_PLAN_OPTIONS = ['Sí', 'Parcial', 'No'];
export const CHECKLIST_COMPLETE_OPTIONS = ['Sí', 'No'];
export const MISTAKE_TYPE_OPTIONS = [
  '',
  'Ninguno',
  'Entrada temprana',
  'Entrada tardía',
  'Stop movido',
  'Salida anticipada',
  'Sobreoperación',
  'FOMO / impulso',
  'Revancha',
  'Sin plan',
  'Otro'
];

function hasText(value) {
  return String(value ?? '').trim() !== '';
}

function hasMetric(form = {}) {
  return hasText(form.resultMoney) || hasText(form.resultPct) || hasText(form.resultR);
}

export function isValidTradeDate(value) {
  const day = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T12:00:00`);
  return Number.isFinite(d.getTime());
}

/**
 * Hard validation for step navigation / save.
 * Soft warnings are separate — never block for missing emotion/setup/note.
 */
export function validateTradeStep(form = {}, stepId = 'result', { accountValue } = {}) {
  const errors = {};
  if (stepId === 'result') {
    if (!isValidTradeDate(form.date || form.tradingDay)) {
      errors.date = 'Fecha inválida.';
    }
    if (!hasText(accountValue || form.account || form.accountName)) {
      errors.account = 'Seleccioná una cuenta.';
    }
    if (!hasText(form.result)) {
      errors.result = 'Seleccioná el resultado.';
    }
    if (!hasMetric(form)) {
      errors.metric = 'Cargá P/L en $ o resultado en R.';
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateTradeFormHard(form = {}, opts = {}) {
  return validateTradeStep(form, 'result', opts);
}

/**
 * Checklist quality signal — never blocks save or base P/L / R / equity math.
 * "not-linked" ≠ plan break; it only means no pre-trade validation evidence.
 */
export function resolveChecklistQualityFields(form = {}) {
  const checklist = Array.isArray(form.checklist) ? form.checklist : [];
  const completeExplicit =
    form.checklistComplete === true || form.checklistComplete === 'Sí';
  const incompleteExplicit =
    form.checklistComplete === false ||
    form.checklistComplete === 'No' ||
    form.executedWithoutFullChecklist === true;
  const hasLinkEvidence =
    form.createdFromChecklist === true ||
    hasText(form.checklistId) ||
    checklist.length > 0;

  const checklistLinked = hasLinkEvidence || completeExplicit || incompleteExplicit;

  let checklistComplete = null;
  if (completeExplicit) checklistComplete = true;
  else if (incompleteExplicit) checklistComplete = false;
  else if (checklist.length > 0) checklistComplete = true;

  let preTradeValidation = 'not-linked';
  if (checklistLinked) {
    if (checklistComplete === false || form.executedWithoutFullChecklist === true) {
      preTradeValidation = 'incomplete';
    } else if (
      checklistComplete === true ||
      (form.createdFromChecklist === true && form.checklistFinalGreen === true)
    ) {
      preTradeValidation = 'validated';
      if (checklistComplete == null) checklistComplete = true;
    } else {
      preTradeValidation = 'incomplete';
    }
  }

  const dataQualityFlags = [];
  if (preTradeValidation === 'not-linked') dataQualityFlags.push('missing-checklist');
  if (preTradeValidation === 'incomplete') dataQualityFlags.push('incomplete-checklist');

  return {
    checklistLinked,
    checklistComplete,
    preTradeValidation,
    dataQualityFlags
  };
}

/**
 * Soft warnings — save still allowed.
 */
export function getTradeFormSoftWarnings(form = {}) {
  const warnings = [];
  const quality = resolveChecklistQualityFields(form);
  const money = Number(String(form.resultMoney ?? '').replace(',', '.'));
  const result = String(form.result || '').toLowerCase();
  if (Number.isFinite(money) && money !== 0 && result) {
    if (money > 0 && (result.includes('stop') || result.includes('loss'))) {
      warnings.push({
        id: 'coherence',
        message: 'P/L positivo con resultado de pérdida — revisá coherencia antes de guardar.'
      });
    } else if (money < 0 && (result.includes('profit') || result.includes('win'))) {
      warnings.push({
        id: 'coherence',
        message: 'P/L negativo con resultado de ganancia — revisá coherencia antes de guardar.'
      });
    }
  }

  if (!hasText(form.setup) && !hasText(form.pattern)) {
    warnings.push({
      id: 'setup',
      message: "Sin setup, Analytics lo agrupará como 'Sin setup'."
    });
  }
  if (!hasText(form.emotionBefore) && !hasText(form.emotionAfter) && !hasText(form.estadoMental)) {
    warnings.push({
      id: 'emotion',
      tone: 'soft',
      message: 'Podés guardar, pero este trade no alimentará completo el análisis emocional.'
    });
  }
  if (quality.preTradeValidation === 'not-linked') {
    warnings.push({
      id: 'checklist',
      tone: 'soft',
      message: 'Checklist no vinculado. Podés guardar el trade igual, pero no contará como entrada validada por tu plan operativo.'
    });
  } else if (quality.preTradeValidation === 'incomplete') {
    warnings.push({
      id: 'checklist',
      tone: 'soft',
      message: 'Validación incompleta. Podés guardar igual; el resultado cuenta, pero no queda como entrada validada por tu plan.'
    });
  }
  if (!hasText(form.lesson) && !hasText(form.privateJournal) && !hasText(form.notes)) {
    warnings.push({
      id: 'note',
      message: 'Sin nota, el Journal pierde contexto de aprendizaje.'
    });
  }
  if (!hasText(form.captureUrl) && !hasText(form.captureLink) && !hasText(form.captureFileName)) {
    warnings.push({
      id: 'screenshot',
      message: 'Sin evidencia visual, la revisión posterior será más lenta.'
    });
  }
  return warnings;
}

export function buildTradeSummary(form = {}, { accountValue } = {}) {
  const money = String(form.resultMoney ?? '').trim();
  const r = String(form.resultR ?? '').trim();
  const asset = String(form.asset || '').trim() || 'Sin activo';
  return {
    date: String(form.date || form.tradingDay || '—').slice(0, 10),
    account: accountValue || form.account || form.accountName || '—',
    asset,
    result: form.result || '—',
    pnl: money !== '' ? `$${money}` : '—',
    rMultiple: r !== '' ? `${r}R` : '—',
    setup: form.setup || form.pattern || 'Sin setup',
    session: form.session || '—',
    side: form.side || '—',
    followedPlan: form.followedPlanLabel || (form.followedPlan === true ? 'Sí' : form.followedPlan === false ? 'No' : '—'),
    emotionBefore: form.emotionBefore || '—',
    emotionAfter: form.emotionAfter || '—'
  };
}

/** Map Sí/Parcial/No UI → boolean + label for analytics compatibility. */
export function resolveFollowedPlanFields(label) {
  const raw = String(label || '').trim();
  if (!raw) return { followedPlan: undefined, followedPlanLabel: '', planFollowed: undefined };
  if (/^s[ií]$/i.test(raw)) return { followedPlan: true, followedPlanLabel: 'Sí', planFollowed: true };
  if (/^parcial/i.test(raw)) return { followedPlan: false, followedPlanLabel: 'Parcial', planFollowed: false };
  if (/^no$/i.test(raw)) return { followedPlan: false, followedPlanLabel: 'No', planFollowed: false };
  return { followedPlan: undefined, followedPlanLabel: raw, planFollowed: undefined };
}

export function resolveChecklistCompleteFields(label, checklist = []) {
  const raw = String(label || '').trim();
  if (/^s[ií]$/i.test(raw)) return { checklistComplete: true };
  if (/^no$/i.test(raw)) return { checklistComplete: false };
  if (Array.isArray(checklist) && checklist.length > 0) return { checklistComplete: true };
  return { checklistComplete: undefined };
}
