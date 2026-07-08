import { Target, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

const toneIcon = { positive: TrendingUp, negative: AlertTriangle, warn: AlertTriangle, neutral: Target };

export function AnalyticsBrief({ brief }) {
  if (!brief) return null;
  const EdgeIcon = toneIcon[brief.edge?.tone] || Target;
  const LeakIcon = toneIcon[brief.leak?.tone] || AlertTriangle;

  return (
    <section className="analyticsBrief">
      <div className="analyticsBriefHead">
        <Zap size={16} />
        <h3>Brief operativo</h3>
        <em className="analyticsBriefConfidence">{brief.confidence?.tier}</em>
      </div>
      <div className="analyticsBriefGrid">
        <article className={`analyticsBriefCell ${brief.edge?.tone || 'neutral'}`}>
          <div className="analyticsBriefCellTop">
            <EdgeIcon size={14} />
            <span>{brief.edge?.label}</span>
          </div>
          <b className="analyticsBriefName" title={brief.edge?.name}>{brief.edge?.name}</b>
          {brief.edge?.value && brief.edge.value !== '—' && (
            <strong className={`analyticsBriefValue ${brief.edge.tone === 'positive' ? 'pos' : ''}`}>{brief.edge.value}</strong>
          )}
          <small>{brief.edge?.meta}</small>
        </article>
        <article className={`analyticsBriefCell ${brief.leak?.tone || 'neutral'}`}>
          <div className="analyticsBriefCellTop">
            <LeakIcon size={14} />
            <span>{brief.leak?.label}</span>
          </div>
          <b className="analyticsBriefName" title={brief.leak?.name}>{brief.leak?.name}</b>
          {brief.leak?.value && (
            <strong className="analyticsBriefValue neg">{brief.leak.value}</strong>
          )}
          <small>{brief.leak?.meta}</small>
        </article>
        <article className="analyticsBriefDecision span2">
          <span>Decisión de la semana</span>
          <p>{brief.decision?.text}</p>
        </article>
        <article className="analyticsBriefConfidenceCell">
          <span>Confianza</span>
          <b>{brief.confidence?.short}</b>
          <small>{brief.confidence?.detail}</small>
        </article>
      </div>
    </section>
  );
}
