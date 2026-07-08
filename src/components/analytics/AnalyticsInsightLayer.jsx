import { Sparkles, TrendingUp, AlertTriangle, Target, Activity } from 'lucide-react';

const toneIcon = {
  positive: TrendingUp,
  negative: AlertTriangle,
  neutral: Activity,
  warn: Target
};

export function AnalyticsInsightLayer({ insights = [], compact = false }) {
  if (!insights.length) return null;
  return (
    <section className={`analyticsInsightLayer ${compact ? 'compact' : ''}`}>
      <div className="analyticsInsightHead">
        <span><Sparkles size={15} /> Diagnóstico operativo</span>
        {!compact && (
          <>
            <h3>Lectura del sistema</h3>
            <p className="analyticsTextBody">Insights derivados de tu muestra actual. Lectura prudente, no predicción.</p>
          </>
        )}
      </div>
      <div className="analyticsInsightGrid">
        {insights.map((item, i) => {
          const Icon = toneIcon[item.tone] || Activity;
          return (
            <article key={`${item.label}-${i}`} className={`analyticsInsightCard ${item.tone || 'neutral'}`}>
              <div className="analyticsInsightCardTop">
                <Icon size={16} />
                <em>{item.label}</em>
              </div>
              <b>{item.title}</b>
              <p className="analyticsTextBody">{item.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
