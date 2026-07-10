/**
 * Sprint 08 — First-run / Onboarding Activation
 * Pure helper: activation progress toward Decision Intelligence.
 * No DOM, no Firebase, no side effects.
 */

export const ONBOARDING_DIAGNOSTIC_MIN = 10;
export const ONBOARDING_RELIABLE_MIN = 20;

export const ACTIVATION_LEVEL = Object.freeze({
  EMPTY: 'empty',
  STARTED: 'started',
  BUILDING_SAMPLE: 'building-sample',
  DIAGNOSTIC_READY: 'diagnostic-ready'
});

const VALID_TARGETS = new Set(['journal', 'checklist', 'emotional', 'risk', 'analytics', 'settings']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function finiteCount(value) {
  if (Array.isArray(value)) return value.length;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function resolveAccounts(accounts, userProfile) {
  if (Array.isArray(accounts)) return accounts;
  const settings = asObject(accounts);
  if (Array.isArray(settings.accounts)) return settings.accounts;
  const profile = asObject(userProfile);
  if (Array.isArray(profile.accounts)) return profile.accounts;
  return [];
}

function hasActiveAccount(accounts, userProfile) {
  const list = resolveAccounts(accounts, userProfile);
  if (list.some((a) => Number(a?.capital || 0) > 0 || Number(a?.initialBalance || 0) > 0)) {
    return true;
  }
  const settings = asObject(accounts);
  if (Number(settings.initialBalance || 0) > 0) return true;
  const profile = asObject(userProfile);
  if (Number(profile.initialBalance || profile.capital || 0) > 0) return true;
  // Default workspace often ships with a seeded account name even before capital edit.
  if (list.some((a) => String(a?.name || '').trim())) return true;
  return false;
}

function isRiskConfigured(riskSettings) {
  if (riskSettings == null) return false;
  if (typeof riskSettings === 'boolean') return riskSettings;
  const rs = asObject(riskSettings);
  if (rs.confirmed === true || rs.saved === true || rs.__confirmed === true || rs.userSaved === true) {
    return true;
  }
  // Explicit empty object / nullish → not confirmed.
  if (!Object.keys(rs).length) return false;
  // Prefer explicit confirmation; raw defaults alone do not complete the step.
  return false;
}

function safeTarget(target, fallback = 'journal') {
  const t = String(target || '').trim();
  if (VALID_TARGETS.has(t)) return t;
  return fallback;
}

function activationLevelFromTrades(tradeCount) {
  if (tradeCount >= ONBOARDING_DIAGNOSTIC_MIN) return ACTIVATION_LEVEL.DIAGNOSTIC_READY;
  if (tradeCount >= 5) return ACTIVATION_LEVEL.BUILDING_SAMPLE;
  if (tradeCount >= 1) return ACTIVATION_LEVEL.STARTED;
  return ACTIVATION_LEVEL.EMPTY;
}

function buildStep({ id, label, detail, done, active, optional = false, progress, target, actionLabel }) {
  let status = 'locked';
  if (done) status = 'done';
  else if (optional && !active) status = 'optional';
  else if (active) status = 'active';
  else if (optional) status = 'optional';

  return {
    id,
    label,
    detail,
    status,
    progress: Math.max(0, Math.min(100, Number(progress) || (done ? 100 : 0))),
    target: safeTarget(target),
    actionLabel: actionLabel || 'Continuar'
  };
}

/**
 * @param {object} input
 * @param {array|number} [input.trades]
 * @param {array|object} [input.accounts]
 * @param {array|number} [input.checklistEntries]
 * @param {array|number} [input.emotionalJournals]
 * @param {object|boolean|null} [input.riskSettings]
 * @param {object} [input.userProfile]
 * @param {Date|string|number} [input.now] — reserved for future time-based rules
 */
export function buildOnboardingState(input = {}) {
  const src = asObject(input);
  const tradesList = asArray(src.trades);
  const tradeCount = Array.isArray(src.trades) ? tradesList.length : finiteCount(src.trades);
  const checklistCount = Array.isArray(src.checklistEntries)
    ? src.checklistEntries.length
    : finiteCount(src.checklistEntries ?? src.checklists);
  const emotionCount = Array.isArray(src.emotionalJournals)
    ? src.emotionalJournals.length
    : finiteCount(src.emotionalJournals ?? src.emotionalCheckins);
  const accountReady = hasActiveAccount(src.accounts ?? src.settings, src.userProfile);
  const riskReady = isRiskConfigured(src.riskSettings);
  const activationLevel = activationLevelFromTrades(tradeCount);
  const isFirstRun = tradeCount === 0;
  const isActivated = tradeCount >= ONBOARDING_DIAGNOSTIC_MIN;

  const accountDone = accountReady;
  const firstTradeDone = tradeCount >= 1;
  const sampleDone = tradeCount >= ONBOARDING_DIAGNOSTIC_MIN;
  const checklistDone = checklistCount > 0;
  const emotionDone = emotionCount > 0;
  const riskDone = riskReady;

  const sampleProgress = Math.min(100, Math.round((tradeCount / ONBOARDING_DIAGNOSTIC_MIN) * 100));

  // Order: account → first trade → sample → checklist → emotion → risk
  const doneFlags = [accountDone, firstTradeDone, sampleDone, checklistDone, emotionDone, riskDone];
  const firstPending = doneFlags.findIndex((d) => !d);

  const steps = [
    buildStep({
      id: 'account',
      label: 'Configurá tu cuenta operativa',
      detail: 'Capital y cuenta activa para métricas correctas.',
      done: accountDone,
      active: firstPending === 0,
      progress: accountDone ? 100 : 0,
      target: 'settings',
      actionLabel: 'Configurar cuenta'
    }),
    buildStep({
      id: 'first-trade',
      label: 'Registrá tu primer trade',
      detail: 'Tu diagnóstico empieza con la primera ejecución.',
      done: firstTradeDone,
      active: firstPending === 1,
      progress: firstTradeDone ? 100 : 0,
      target: 'journal',
      actionLabel: tradeCount === 0 ? 'Registrar primer trade' : 'Ir al Journal'
    }),
    buildStep({
      id: 'sample',
      label: 'Cargá 10 trades comparables',
      detail: 'Mínimo para activar diagnóstico operativo (edge, fuga, acción).',
      done: sampleDone,
      active: firstPending === 2,
      progress: sampleProgress,
      target: 'journal',
      actionLabel: tradeCount >= 1 ? 'Cargar trade' : 'Registrar primer trade'
    }),
    buildStep({
      id: 'checklist',
      label: 'Completá tu checklist operativo',
      detail: 'Definí tu filtro antes de operar.',
      done: checklistDone,
      active: firstPending === 3,
      optional: true,
      progress: checklistDone ? 100 : 0,
      target: 'checklist',
      actionLabel: 'Completar checklist'
    }),
    buildStep({
      id: 'emotion',
      label: 'Registrá tu primer check-in emocional',
      detail: 'Conectá estado interno con ejecución.',
      done: emotionDone,
      active: firstPending === 4,
      optional: true,
      progress: emotionDone ? 100 : 0,
      target: 'emotional',
      actionLabel: 'Registrar check-in'
    }),
    buildStep({
      id: 'risk',
      label: 'Definí límites de riesgo',
      detail: 'Pérdida diaria, trades/día y riesgo por operación.',
      done: riskDone,
      active: firstPending === 5,
      optional: true,
      progress: riskDone ? 100 : 0,
      target: 'risk',
      actionLabel: 'Definir límites'
    })
  ];

  const doneStepCount = steps.filter((s) => s.status === 'done').length;
  const progressPct = Math.round(
    Math.min(100, sampleProgress * 0.65 + (doneStepCount / Math.max(1, steps.length)) * 100 * 0.35)
  );

  const primary = steps.find((s) => s.status === 'active') || steps.find((s) => s.status !== 'done') || steps[2];
  const primaryStep = {
    id: primary.id,
    title: primary.label,
    detail: primary.detail,
    actionLabel: primary.actionLabel,
    target: primary.target
  };

  const unlocks = [
    {
      id: 'journal',
      title: 'Journal activo',
      detail: 'Con 1 trade ya registrás evidencia de ejecución.',
      unlocked: tradeCount >= 1
    },
    {
      id: 'hypotheses',
      title: 'Primeras hipótesis',
      detail: 'Con 5 trades empiezan lecturas iniciales de patrón.',
      unlocked: tradeCount >= 5
    },
    {
      id: 'diagnostic',
      title: 'Diagnóstico operativo',
      detail: 'Con 10 trades MTC detecta edge, fuga y acción semanal.',
      unlocked: tradeCount >= ONBOARDING_DIAGNOSTIC_MIN
    },
    {
      id: 'reliable',
      title: 'Lectura confiable',
      detail: 'Con 20+ trades la muestra gana confiabilidad.',
      unlocked: tradeCount >= ONBOARDING_RELIABLE_MIN
    },
    {
      id: 'cockpit-full',
      title: 'Cockpit completo',
      detail: 'Checklist + emoción conectan filtro y estado interno.',
      unlocked: checklistDone && emotionDone
    }
  ];

  return {
    isFirstRun,
    isActivated,
    activationLevel,
    progressPct,
    primaryStep,
    steps,
    unlocks,
    counts: {
      trades: tradeCount,
      accounts: resolveAccounts(src.accounts ?? src.settings, src.userProfile).length || (accountReady ? 1 : 0),
      checklistEntries: checklistCount,
      emotionalCheckins: emotionCount
    },
    diagnosticMin: ONBOARDING_DIAGNOSTIC_MIN,
    reliableMin: ONBOARDING_RELIABLE_MIN
  };
}

export function readOnboardingDismissed() {
  try {
    return localStorage.getItem('mtc:onboarding:dismissed') === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingDismissed(dismissed = true) {
  try {
    if (dismissed) localStorage.setItem('mtc:onboarding:dismissed', '1');
    else localStorage.removeItem('mtc:onboarding:dismissed');
  } catch {
    /* ignore */
  }
}

/**
 * Visibility rule for FirstRunPanel.
 * Never hide when trades === 0.
 */
export function shouldShowFirstRunPanel(onboardingState, { dismissed = false } = {}) {
  const state = asObject(onboardingState);
  const trades = Number(state.counts?.trades || 0);
  if (trades === 0 || state.isFirstRun) return true;
  if (state.activationLevel === ACTIVATION_LEVEL.DIAGNOSTIC_READY) return false;
  if (dismissed) return false;
  return state.activationLevel !== ACTIVATION_LEVEL.DIAGNOSTIC_READY;
}
