import { Target } from 'lucide-react';

export function AnalyticsWeeklyPlan({ plan, compact = false }) {
  if (!plan?.bullets?.length) return null;

  if (compact) {
    return (
      <section className="analyticsWeeklyPlan analyticsWeeklyPlanCompact analyticsTier3Block analyticsSurfaceSupport">
        <header className="analyticsWeeklyPlanCompactHead">
          <div>
            <h4>Orden semanal</h4>
            <p>{plan.hasMinimal ? 'Directivas de la muestra actual.' : 'Recolectar muestra antes de concluir.'}</p>
          </div>
          <span className="analyticsWeeklyPlanCompactIcon" aria-hidden="true">
            <Target size={13} strokeWidth={2} />
          </span>
        </header>
        <ol className="analyticsWeeklyPlanCompactList">
          {plan.bullets.map((bullet, i) => (
            <li key={i}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <p>{bullet}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const subtitle = plan.hasMinimal
    ? 'Directivas derivadas de tu muestra actual.'
    : 'Priorizá recolección antes de conclusiones finales.';

  return (
    <section className="analyticsWeeklyPlan analyticsTier3Block analyticsStrategicClose">
      <header className="analyticsWeeklyPlanHead">
        <div className="analyticsWeeklyPlanIcon" aria-hidden="true">
          <Target size={16} strokeWidth={1.75} />
        </div>
        <div className="analyticsWeeklyPlanCopy">
          <span className="analyticsWeeklyPlanEyebrow">Orden estratégica</span>
          <h3>{plan.title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>
      <ol className="analyticsWeeklyPlanList">
        {plan.bullets.map((bullet, i) => (
          <li key={i}>
            <span className="analyticsWeeklyPlanIndex">{String(i + 1).padStart(2, '0')}</span>
            <span className="analyticsWeeklyPlanBullet">{bullet}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
