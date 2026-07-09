import { BarChart3 } from 'lucide-react';
import { buildSampleQuality, ANALYTICS_USABLE_SAMPLE } from '../../lib/analyticsUtils.js';

/**
 * Empty / formation states — honest, no fake metrics.
 * Bands: 0 · 1–4 insufficient · 5–9 observing.
 */
export function AnalyticsEmptyState({
  onGoJournal,
  count = 0,
  sample: sampleProp = null,
  compact = false
}) {
  const sample = sampleProp || buildSampleQuality(count);
  const n = Number(count || 0);
  const target = sample.minRequired || (n < 5 ? 5 : ANALYTICS_USABLE_SAMPLE);
  const progressPct = Math.min(100, Number(sample.progressPct ?? Math.round((n / target) * 100)));
  const remaining = Math.max(0, target - n);

  let title = 'Muestra en formación';
  let body = sample.message;

  if (n === 0) {
    title = 'Sin trades evaluables';
    body = 'Registrá trades cerrados en el Journal para activar el diagnóstico ejecutivo (edge, fuga, acción y confiabilidad).';
  } else if (sample.quality === 'insufficient') {
    title = 'Muestra insuficiente';
    body = `${n} trade${n === 1 ? '' : 's'} · faltan ${remaining} para observación. El diagnóstico ya muestra dirección; aún no hay métricas confiables.`;
  } else if (sample.quality === 'observing') {
    title = 'Muestra en observación';
    body = `${n} trades · faltan ${Math.max(0, ANALYTICS_USABLE_SAMPLE - n)} para lectura usable. Usá el diagnóstico; no escales riesgo todavía.`;
  }

  return (
    <div className={`analyticsEmptyPremium ${compact ? 'compact' : ''} tone-${sample.tone || 'warn'}`}>
      <span><BarChart3 size={compact ? 22 : 28} /></span>
      <b>{title}</b>
      <p>{body}</p>
      <div className="analyticsEdgeProgress">
        <div className="analyticsEdgeProgressBar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <small>{n}/{target} trades · {sample.short || sample.label}</small>
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
