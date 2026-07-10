import { Rocket, X } from 'lucide-react';
import { OnboardingProgress } from './OnboardingProgress.jsx';
import {
  ACTIVATION_LEVEL,
  ONBOARDING_DIAGNOSTIC_MIN
} from '../../lib/onboardingState.js';

function titleForLevel(level, tradeCount) {
  if (level === ACTIVATION_LEVEL.DIAGNOSTIC_READY || tradeCount >= ONBOARDING_DIAGNOSTIC_MIN) {
    return 'Diagnóstico operativo activo';
  }
  if (level === ACTIVATION_LEVEL.BUILDING_SAMPLE || tradeCount >= 5) {
    return 'Construyendo muestra operativa';
  }
  if (level === ACTIVATION_LEVEL.STARTED || tradeCount >= 1) {
    return 'Construyendo muestra operativa';
  }
  return 'Activá tu diagnóstico operativo';
}

function secondaryAction(onboardingState) {
  const steps = onboardingState?.steps || [];
  const checklist = steps.find((s) => s.id === 'checklist');
  const emotion = steps.find((s) => s.id === 'emotion');
  if (checklist && checklist.status !== 'done') {
    return { label: 'Completar checklist', target: 'checklist' };
  }
  if (emotion && emotion.status !== 'done') {
    return { label: 'Registrar check-in emocional', target: 'emotional' };
  }
  return null;
}

/**
 * First-run / activation panel for Dashboard.
 * Props: { onboardingState, onNavigate, onDismiss?, compact? }
 */
export function FirstRunPanel({
  onboardingState,
  onNavigate,
  onDismiss,
  compact: compactProp
}) {
  const state = onboardingState || null;
  if (!state) return null;

  const tradeCount = Number(state.counts?.trades || 0);
  const level = state.activationLevel || ACTIVATION_LEVEL.EMPTY;
  const diagnosticMin = state.diagnosticMin || ONBOARDING_DIAGNOSTIC_MIN;
  const compact = compactProp ?? (tradeCount > 0 && tradeCount < diagnosticMin);
  const canDismiss = typeof onDismiss === 'function' && tradeCount > 0;
  const progressPct = Math.min(100, Math.round((tradeCount / diagnosticMin) * 100));
  const primary = state.primaryStep || {};
  const secondary = secondaryAction(state);
  const unlocks = (state.unlocks || []).slice(0, 4);

  const navigate = (target) => {
    if (typeof onNavigate === 'function' && target) onNavigate(target);
  };

  const primaryLabel =
    primary.actionLabel ||
    (tradeCount === 0 ? 'Registrar primer trade' : tradeCount < diagnosticMin ? 'Cargar trade' : 'Ir al Journal');

  return (
    <section
      className={[
        'firstRunPanel',
        compact ? 'firstRunPanel--compact' : 'firstRunPanel--hero',
        `firstRunPanel--${level}`
      ].join(' ')}
      aria-label="Activación Decision Intelligence"
    >
      <header className="firstRunHeader">
        <div className="firstRunHeaderMain">
          <span className="firstRunEyebrow">
            <Rocket size={13} /> ACTIVACIÓN
          </span>
          <h2>{titleForLevel(level, tradeCount)}</h2>
          <p>
            Cargá {diagnosticMin} trades para que MTC detecte edge, fuga y acción semanal.
          </p>
        </div>
        {canDismiss && (
          <button
            type="button"
            className="firstRunDismiss"
            onClick={onDismiss}
            aria-label="Ocultar guía de activación"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <div className="firstRunProgress">
        <div className="firstRunProgressTrack" aria-hidden="true">
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <div className="firstRunProgressMeta">
          <b>{tradeCount}/{diagnosticMin} trades</b>
          <span>{Math.round(state.progressPct || progressPct)}% hacia Decision Intelligence</span>
        </div>
      </div>

      <div className="firstRunActions">
        <button
          type="button"
          className="primary firstRunPrimaryCta"
          onClick={() => navigate(primary.target || 'journal')}
        >
          {primaryLabel}
        </button>
        {secondary && (
          <button
            type="button"
            className="ghost firstRunSecondaryCta"
            onClick={() => navigate(secondary.target)}
          >
            {secondary.label}
          </button>
        )}
      </div>

      {!compact && (
        <>
          <OnboardingProgress steps={state.steps} onNavigate={navigate} />
          <div className="firstRunUnlocks">
            {unlocks.map((u) => (
              <div
                key={u.id}
                className={`firstRunUnlock ${u.unlocked ? 'firstRunUnlock--on' : ''}`}
              >
                <b>{u.title}</b>
                <small>{u.detail}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {compact && (
        <OnboardingProgress steps={state.steps} onNavigate={navigate} compact />
      )}
    </section>
  );
}
