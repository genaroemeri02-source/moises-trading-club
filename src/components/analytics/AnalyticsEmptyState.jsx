import { BarChart3 } from 'lucide-react';
import { buildSampleQuality, ANALYTICS_USABLE_SAMPLE } from '../../lib/analyticsUtils.js';

/**
 * Empty / formation states — honest, no fake metrics.
 * Bands: 0 · 1–4 insufficient · 5–9 observing.
 * Sprint 08: activation copy toward 10-trade diagnostic.
 */
export function AnalyticsEmptyState({
  onGoJournal,
  count = 0,
  sample: sampleProp = null,
  compact = false
}) {
  const sample = sampleProp || buildSampleQuality(count);
  const n = Number(count || 0);
  const target = ANALYTICS_USABLE_SAMPLE;
  const progressPct = Math.min(100, Number(sample.progressPct ?? Math.round((n / target) * 100)));
  const remaining = Math.max(0, target - n);

  let title = 'Analytics se activa con 10 trades comparables.';
  let body = sample.message;

  if (n === 0) {
    title = 'Analytics se activa con 10 trades comparables.';
    body = 'Registrá trades cerrados en el Journal. Con la muestra mínima MTC desbloquea edge activo, fuga principal, directivas operativas y confiabilidad de muestra.';
  } else if (sample.quality === 'insufficient') {
    title = 'Muestra insuficiente';
    body = `${n} trade${n === 1 ? '' : 's'} · faltan ${remaining} para diagnóstico operativo. Todavía no hay edge ni fuga confiables.`;
  } else if (sample.quality === 'observing') {
    title = 'Construyendo muestra operativa';
    body = `${n} trades · faltan ${remaining} para lectura usable. Usá la dirección; no escales riesgo todavía.`;
  }

  const unlocks = [
    { label: 'Edge activo', on: n >= target },
    { label: 'Fuga principal', on: n >= target },
    { label: 'Directivas operativas', on: n >= target },
    { label: 'Confiabilidad de muestra', on: n >= 20 }
  ];

  return (
    <div className={`analyticsEmptyPremium emptyStateActivation ${compact ? 'compact' : ''} tone-${sample.tone || 'warn'}`}>
      <span><BarChart3 size={compact ? 22 : 28} /></span>
      <b>{title}</b>
      <p>{body}</p>
      <div className="analyticsEdgeProgress">
        <div className="analyticsEdgeProgressBar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <small>{n}/{target} trades · {sample.short || sample.label}</small>
      </div>
      {!compact && (
        <ul className="emptyStateUnlockList">
          {unlocks.map((u) => (
            <li key={u.label} className={u.on ? 'on' : ''}>{u.label}</li>
          ))}
        </ul>
      )}
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
