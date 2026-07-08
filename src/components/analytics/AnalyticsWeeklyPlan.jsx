import { CalendarCheck } from 'lucide-react';

export function AnalyticsWeeklyPlan({ plan }) {
  if (!plan?.bullets?.length) return null;

  return (
    <section className="analyticsWeeklyPlan">
      <header className="analyticsWeeklyPlanHead">
        <CalendarCheck size={15} strokeWidth={2} aria-hidden="true" />
        <div>
          <h3>{plan.title}</h3>
          <p>
            {plan.hasMinimal
              ? 'Directivas derivadas de tu muestra actual.'
              : 'Priorizá recolección antes de conclusiones finales.'}
          </p>
        </div>
      </header>
      <ul className="analyticsWeeklyPlanList">
        {plan.bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}
