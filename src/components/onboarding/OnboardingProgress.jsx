import { CheckCircle2, Circle, Lock, ChevronRight } from 'lucide-react';

const STATUS_ICON = {
  done: CheckCircle2,
  active: Circle,
  locked: Lock,
  optional: Circle
};

/**
 * Visual checklist of onboarding steps.
 */
export function OnboardingProgress({ steps = [], onNavigate, compact = false }) {
  if (!steps.length) return null;

  return (
    <ol className={`firstRunSteps ${compact ? 'firstRunSteps--compact' : ''}`}>
      {steps.map((step) => {
        const Icon = STATUS_ICON[step.status] || Circle;
        const clickable = step.status !== 'locked' && typeof onNavigate === 'function';
        const className = [
          'firstRunStep',
          `firstRunStep--${step.status || 'locked'}`
        ].join(' ');

        const body = (
          <>
            <span className="firstRunStepIcon" aria-hidden="true">
              <Icon size={compact ? 14 : 16} />
            </span>
            <div className="firstRunStepBody">
              <b>{step.label}</b>
              {!compact && <small>{step.detail}</small>}
              {step.status === 'active' && step.progress > 0 && step.progress < 100 && (
                <span className="firstRunStepMeta">{Math.round(step.progress)}%</span>
              )}
            </div>
            {clickable && step.status !== 'done' && (
              <span className="firstRunStepCta">
                {compact ? <ChevronRight size={14} /> : step.actionLabel}
              </span>
            )}
          </>
        );

        if (clickable) {
          return (
            <li key={step.id} className={className}>
              <button
                type="button"
                className="firstRunStepBtn"
                onClick={() => onNavigate(step.target)}
              >
                {body}
              </button>
            </li>
          );
        }

        return (
          <li key={step.id} className={className}>
            <div className="firstRunStepBtn firstRunStepBtn--static">{body}</div>
          </li>
        );
      })}
    </ol>
  );
}
