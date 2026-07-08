import { BarChart3 } from 'lucide-react';
import { ANALYTICS_MIN_SAMPLE } from '../../lib/analyticsUtils.js';

export function AnalyticsEmptyState({ onGoJournal, count = 0 }) {
  const target = count < 5 ? 5 : ANALYTICS_MIN_SAMPLE;
  const progressPct = Math.min(100, Math.round((count / target) * 100));
  const remaining = Math.max(0, target - count);

  return (
    <div className="analyticsEmptyPremium">
      <span><BarChart3 size={28} /></span>
      <b>Muestra en formación</b>
      <p>
        {count === 0
          ? 'Registrá trades cerrados en el Journal para activar Edge Score y lecturas operativas.'
          : `Necesitás ${remaining} trade${remaining === 1 ? '' : 's'} más para lectura ${count < 5 ? 'inicial' : 'interpretable'}.`}
      </p>
      <div className="analyticsEdgeProgress">
        <div className="analyticsEdgeProgressBar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <small>{count}/{target} trades</small>
      </div>
      {onGoJournal && (
        <button type="button" className="ghost compact" onClick={onGoJournal}>
          Ir al Journal
        </button>
      )}
    </div>
  );
}

export function AnalyticsSectionEmpty({ title, text, compact = false }) {
  return (
    <div className={`analyticsSectionEmpty ${compact ? 'compact' : ''}`}>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}
