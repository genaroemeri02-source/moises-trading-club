import { KpiMiniGauge } from '../dashboard/DashboardKpiCard.jsx';

export function AnalyticsKpiCard({ label, value, sub, state = 'neutral', meta, hint, variant, wide, className = '' }) {
  return (
    <article className={`analyticsKpiCard ${variant || 'compact'} ${wide ? 'wide' : ''} ${state} ${className}`.trim()}>
      <div className="analyticsKpiCardTop">
        <span>{label}</span>
        {meta && <em>{meta}</em>}
      </div>
      <b className="analyticsKpiValue">{value}</b>
      {sub && <small className="analyticsKpiSub">{sub}</small>}
      {hint && <small className="analyticsKpiHint">{hint}</small>}
    </article>
  );
}

export { KpiMiniGauge };
