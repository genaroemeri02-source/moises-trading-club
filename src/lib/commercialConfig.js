/**
 * Sprint 09 — Commercial Truth
 * Sprint 10 — SW + Payment Runtime Integrity
 * Single source of truth for plans, prices, and feature availability.
 *
 * Plan id model:
 * - Brand / UI labels: Club, Pro, Mentoría
 * - Internal / Firestore / Render orders: basic, premium, mentorship
 * - Brand aliases accepted at edges: club ↔ basic, pro ↔ premium
 * - Mentorship is WhatsApp-only (no PayPal checkout)
 *
 * Gating truth (Sprint 09/10):
 * - Real gate: approved/paid vs AccessGate (binary)
 * - Club vs Pro feature gating is NOT enforced in the frontend
 * - Plan matrices below are commercial comparison + honesty labels
 */

export const PLAN_IDS = {
  BASE: 'basic',
  PRO: 'premium',
  MENTORSHIP: 'mentorship',
};

/**
 * Bidirectional brand ↔ backend aliases.
 * club/pro = brand; basic/premium = backend/orders/Firestore.
 */
export const PLAN_RUNTIME_ALIASES = {
  club: 'basic',
  pro: 'premium',
  mentorship: 'mentorship',
  basic: 'club',
  premium: 'pro',
};

/**
 * Any known plan id → backend checkout id (basic | premium | mentorship).
 * Checkout payloads MUST use these keys for Render `server/index.js` and `functions/index.js`.
 * Vercel `api/createPayPalOrder.js` also accepts brand aliases.
 */
export const CHECKOUT_PLAN_IDS = {
  club: 'basic',
  pro: 'premium',
  mentorship: 'mentorship',
  basic: 'basic',
  premium: 'premium',
};

/** @deprecated Use CHECKOUT_PLAN_IDS / resolveBackendPlanId */
export const PLAN_CHECKOUT_ALIASES = CHECKOUT_PLAN_IDS;

export const FEATURE_STATUS = {
  AVAILABLE: 'available',
  BETA: 'beta',
  COMING_SOON: 'coming-soon',
  NOT_INCLUDED: 'not-included',
};

export const FEATURE_STATUS_LABEL = {
  [FEATURE_STATUS.AVAILABLE]: 'Disponible',
  [FEATURE_STATUS.BETA]: 'Beta',
  [FEATURE_STATUS.COMING_SOON]: 'Próximamente',
  [FEATURE_STATUS.NOT_INCLUDED]: 'No incluido',
};

/** Canonical monthly prices (USD). Mentorship is display-only. */
export const PLAN_PRICING = {
  basic: { monthly: 14.99, currency: 'USD' },
  premium: { monthly: 24.99, currency: 'USD' },
  mentorship: { monthly: 250, currency: 'USD' },
};

export const BILLING_CYCLES = {
  monthly: { id: 'monthly', label: 'Mensual', short: '1 mes', suffix: '/mes', months: 1, badge: null, featured: false },
  quarterly: { id: 'quarterly', label: 'Trimestral', short: '3 meses', suffix: '/trim.', months: 3, badge: 'Ahorro 20%', featured: false },
  annual: { id: 'annual', label: 'Anual', short: '12 meses', suffix: '/año', months: 12, badge: 'Mejor valor', featured: true },
};

/**
 * Product capability catalog — honest availability, independent of plan marketing.
 * `plans` = which commercial tiers list the feature (not enforced gating).
 */
export const COMMERCIAL_FEATURES = [
  {
    id: 'dashboard',
    label: 'Dashboard operativo',
    description: 'Cockpit del día: estado, riesgo y señales de conducta.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'journal',
    label: 'Journal manual',
    description: 'Registrá operaciones, resultado, setup y notas.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'checklist',
    label: 'Checklist operativo',
    description: 'Validación pre-trade antes de poner capital en riesgo.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'calendar-pl',
    label: 'Calendario P/L',
    description: 'Vista diaria/mensual de resultado y consistencia.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'risk-basic',
    label: 'Gestión básica de riesgo',
    description: 'Límites, lotaje y exposición visibles.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'community',
    label: 'Base / comunidad',
    description: 'Comunidad, ideas del mentor y espacio de aprendizaje.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'onboarding',
    label: 'Onboarding / first-run',
    description: 'Activación guiada hasta muestra usable.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['basic', 'premium', 'mentorship'],
  },
  {
    id: 'analytics',
    label: 'Analytics y diagnóstico operativo',
    description: 'Diagnóstico, edge, fuga y directivas operativas.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'edge-lab',
    label: 'Edge Lab',
    description: 'Lectura de edge, leaks y evidencia de performance.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'directives',
    label: 'Directivas operativas',
    description: 'Acciones concretas derivadas de tu evidencia.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'emotional-journal',
    label: 'Journal emocional',
    description: 'Check-ins y lectura de estado emocional.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'emotion-intelligence',
    label: 'Señales de conducta',
    description: 'Señales de conducta y estado emocional en el cockpit.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'cockpit-advanced',
    label: 'Cockpit operativo avanzado',
    description: 'Estado operativo unificado del día.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'export',
    label: 'Export JSON / CSV',
    description: 'Exportación manual de trades.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'broker-sync',
    label: 'BrokerSync / MT5',
    description: 'Sincronización automática con broker. Hoy: importación manual; sync automático próximamente.',
    status: FEATURE_STATUS.COMING_SOON,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'ai-review',
    label: 'AI Review',
    description: 'Revisión asistida por IA basada en tus datos operativos. No disponible aún.',
    status: FEATURE_STATUS.COMING_SOON,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'pdf-reports',
    label: 'Reportes PDF',
    description: 'Exportación de reportes en PDF.',
    status: FEATURE_STATUS.COMING_SOON,
    plans: ['premium', 'mentorship'],
  },
  {
    id: 'mentorship-review',
    label: 'Revisión personalizada',
    description: 'Seguimiento 1 a 1 y feedback sobre tu proceso.',
    status: FEATURE_STATUS.AVAILABLE,
    plans: ['mentorship'],
  },
];

/** Plan feature rows for landing / paywall (honest labels + status). */
const CLUB_FEATURE_ROWS = [
  { id: 'journal', label: 'Journal manual', status: FEATURE_STATUS.AVAILABLE },
  { id: 'checklist', label: 'Checklist operativo', status: FEATURE_STATUS.AVAILABLE },
  { id: 'calendar-pl', label: 'Calendario P/L', status: FEATURE_STATUS.AVAILABLE },
  { id: 'risk-basic', label: 'Gestión básica de riesgo', status: FEATURE_STATUS.AVAILABLE },
  { id: 'dashboard', label: 'Dashboard operativo', status: FEATURE_STATUS.AVAILABLE },
  { id: 'community', label: 'Base / comunidad', status: FEATURE_STATUS.AVAILABLE },
];

const PRO_FEATURE_ROWS = [
  { id: 'club-included', label: 'Todo Club', status: FEATURE_STATUS.AVAILABLE },
  { id: 'analytics', label: 'Analytics y diagnóstico operativo', status: FEATURE_STATUS.AVAILABLE },
  { id: 'edge-lab', label: 'Edge Lab y directivas operativas', status: FEATURE_STATUS.AVAILABLE },
  { id: 'emotional-journal', label: 'Journal emocional y señales de conducta', status: FEATURE_STATUS.AVAILABLE },
  { id: 'cockpit-advanced', label: 'Cockpit operativo avanzado', status: FEATURE_STATUS.AVAILABLE },
  { id: 'export', label: 'Export JSON / CSV', status: FEATURE_STATUS.AVAILABLE },
  { id: 'broker-sync', label: 'BrokerSync / MT5', status: FEATURE_STATUS.COMING_SOON },
  { id: 'ai-review', label: 'AI Review', status: FEATURE_STATUS.COMING_SOON },
];

const MENTORSHIP_FEATURE_ROWS = [
  { id: 'pro-included', label: 'Todo Pro', status: FEATURE_STATUS.AVAILABLE },
  { id: 'mentorship-review', label: 'Revisión personalizada 1 a 1', status: FEATURE_STATUS.AVAILABLE },
  { id: 'mentorship-followup', label: 'Acompañamiento y seguimiento', status: FEATURE_STATUS.AVAILABLE },
  { id: 'mentorship-feedback', label: 'Feedback sobre proceso', status: FEATURE_STATUS.AVAILABLE },
  { id: 'limited-seats', label: 'Cupos limitados', status: FEATURE_STATUS.AVAILABLE },
];

export const COMMERCIAL_PLANS = [
  {
    id: 'basic',
    checkoutId: 'club',
    name: 'Club',
    priceMonthly: 14.99,
    currency: 'USD',
    kicker: 'Founding Access',
    badge: 'Founding Access',
    subtitle: 'Journal, checklist y riesgo para armar tu rutina diaria.',
    headline: 'Journal, checklist y riesgo para armar tu rutina diaria.',
    valueNote: 'Para quien arranca con registro serio: operaciones, validación pre-trade y límites visibles.',
    cta: 'Activar Club',
    recommended: false,
    tone: 'base',
    available: true,
    paypalKey: 'club',
    features: CLUB_FEATURE_ROWS,
  },
  {
    id: 'premium',
    checkoutId: 'pro',
    name: 'Pro',
    priceMonthly: 24.99,
    currency: 'USD',
    kicker: 'Más elegido',
    badge: 'Más elegido',
    subtitle: 'Diagnóstico de edge, fugas y conducta sobre tu historial.',
    headline: 'Diagnóstico de edge, fugas y conducta sobre tu historial.',
    valueNote: 'Para traders con volumen: edge, fuga principal, directivas semanales y lectura emocional conectada al journal.',
    cta: 'Activar Pro',
    recommended: true,
    tone: 'pro',
    available: true,
    paypalKey: 'pro',
    features: PRO_FEATURE_ROWS,
  },
  {
    id: 'mentorship',
    checkoutId: 'mentorship',
    name: 'Mentoría',
    priceMonthly: 250,
    currency: 'USD',
    kicker: '1 a 1',
    badge: '1 a 1',
    subtitle: 'Revisión 1 a 1 del proceso, con Pro incluido.',
    headline: 'Revisión 1 a 1 del proceso, con Pro incluido.',
    valueNote: 'Cupos limitados. Feedback directo sobre ejecución, riesgo y disciplina. Incluye todo Pro.',
    cta: 'Aplicar a mentoría',
    recommended: false,
    tone: 'mentor',
    available: true,
    paypalKey: null,
    features: MENTORSHIP_FEATURE_ROWS,
  },
];

/** @deprecated Use COMMERCIAL_PLANS — kept as alias for AccessGate consumers */
export const ACCESS_PLANS = COMMERCIAL_PLANS;

export const GATING_TRUTH = {
  mode: 'binary_access',
  summary: 'El frontend solo distingue acceso aprobado vs paywall. Club vs Pro no está gated en UI.',
  real: [
    'isApproved / hasActiveAccess → AccessGate vs app completa',
    'Roles privilegiados (admin, mentor, etc.) bypass',
    'Backend requireFeatureForUser solo en rutas MT5 (UI no las usa)',
  ],
  pending: [
    'Gating Club vs Pro en frontend (Analytics, Emotional, Edge Lab)',
    'Alinear defaultPlanFeatures del server (Club analytics:true) con marketing',
    'Unificar PayPal orders (server) vs subscriptions (api/createPayPalOrder)',
    'Verificar PayPal Dashboard plan amounts vs 14.99/24.99 (env PAYPAL_PLAN_ID_*)',
  ],
  commercialComparisonOnly: true,
};

/** Resolve any known id to backend plan id, or null if unknown. */
export function resolveBackendPlanId(planId) {
  const raw = String(planId || '').trim().toLowerCase();
  return CHECKOUT_PLAN_IDS[raw] || null;
}

/** Resolve any known id to brand alias (club | pro | mentorship), or null. */
export function resolveBrandPlanId(planId) {
  const backend = resolveBackendPlanId(planId);
  if (!backend) return null;
  if (backend === 'basic') return 'club';
  if (backend === 'premium') return 'pro';
  return backend;
}

/**
 * Checkout payload plan id → backend legacy keys (basic | premium | mentorship).
 * Returns null for unknown plans (caller must not create order silently).
 */
export function checkoutPlanId(planId) {
  return resolveBackendPlanId(planId);
}

export function calculatePlanPrice(planId, cycleId = 'monthly') {
  const pricing = PLAN_PRICING[planId];
  if (!pricing || planId === 'mentorship') return null;
  const monthly = pricing.monthly;
  if (cycleId === 'monthly') {
    return { currency: pricing.currency, monthly, regular: monthly, total: monthly, savePct: 0, saveAmount: 0, months: 1 };
  }
  if (cycleId === 'quarterly') {
    const regular = monthly * 3;
    const total = regular * 0.8;
    return { currency: pricing.currency, monthly, regular, total, savePct: 20, saveAmount: regular - total, months: 3 };
  }
  const quarterlyTotal = monthly * 3 * 0.8;
  const regular = quarterlyTotal * 4;
  const total = regular * 0.9;
  const monthlyEquivalent = monthly * 12;
  const effectiveSavePct = Math.round((1 - total / monthlyEquivalent) * 100);
  return { currency: pricing.currency, monthly, regular, total, savePct: 10, effectiveSavePct, saveAmount: regular - total, months: 12 };
}

export function formatCurrencyValue(value, currency = 'USD', options = {}) {
  const amount = Number(value || 0);
  const hasDecimals = Math.abs(amount % 1) > 0.0001;
  const decimals = options.decimals ?? hasDecimals;
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

export function planCycleSummary(planId, cycleId) {
  const price = calculatePlanPrice(planId, cycleId);
  if (!price) return null;
  return {
    price,
    final: formatCurrencyValue(price.total, price.currency),
    regular: price.regular > price.total ? formatCurrencyValue(price.regular, price.currency) : null,
    perMonth: cycleId === 'monthly' ? null : `Equiv. ${formatCurrencyValue(price.total / price.months, price.currency)}/mes`,
  };
}

export function formatPlanMonthlyPrice(plan) {
  const currency = plan.currency || 'USD';
  return formatCurrencyValue(plan.priceMonthly, currency);
}

export function getPlanById(planId) {
  return COMMERCIAL_PLANS.find((p) => p.id === planId) || null;
}

export function featuresForPlan(planId) {
  return COMMERCIAL_FEATURES.filter((f) => f.plans.includes(planId));
}
