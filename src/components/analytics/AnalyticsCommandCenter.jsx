import { ANALYTICS_MIN_SAMPLE } from '../../lib/analyticsUtils.js';

function scoreRingColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 45) return '#fbbf24';
  return '#94a3b8';
}

export function AnalyticsCommandCenter({ edgeData }) {
  if (!edgeData) return null;
  const {
    score,
    commandCopy,
    confidence,
    chips,
    sampleFootnote
  } = edgeData;
  const progressTarget = confidence?.count < 5 ? 5 : ANALYTICS_MIN_SAMPLE;
  const progressPct = Math.min(100, Math.round((confidence?.count || 0) / progressTarget * 100));
  const showProgress = confidence?.count < ANALYTICS_MIN_SAMPLE;
  const headline = commandCopy?.headline || edgeData.diagnosis || edgeData.sentence;
  const weeklyAction = commandCopy?.weeklyAction || edgeData.weeklyAction;

  return (
    <section className="analyticsCommand analyticsCommandStrip analyticsTier1 analyticsSurfaceFlagship">
      <div className="analyticsCommandStripBody">
        <div className="analyticsCommandScore compact">
          <div
            className="analyticsCommandScoreRing"
            style={{ '--score-pct': score, '--ring-color': scoreRingColor(score) }}
          >
            <div className="analyticsCommandScoreInner">
              <b>{score}</b>
              <span>/100</span>
            </div>
          </div>
          <em>Score operativo</em>
        </div>

        <div className="analyticsCommandStripCore">
          <span className="analyticsCommandEyebrow">Diagnóstico ejecutivo</span>
          <h2 className="analyticsCommandHeadline">{headline}</h2>
          {weeklyAction && (
            <p className="analyticsCommandWeeklyInline">
              <span>Acción semanal</span>
              {weeklyAction}
            </p>
          )}
        </div>

        {chips && (
          <div className="analyticsCommandChips" aria-label="Señales compactas">
            <div className="analyticsCommandChip positive">
              <span>Edge</span>
              <b>{chips.edge}</b>
            </div>
            <div className="analyticsCommandChip negative">
              <span>Fuga</span>
              <b>{chips.leak}</b>
            </div>
            <div className="analyticsCommandChip neutral">
              <span>Confianza</span>
              <b>{confidence?.label || '—'}</b>
            </div>
          </div>
        )}
      </div>

      <div className="analyticsCommandStripFoot">
        {showProgress && (
          <div className="analyticsCommandProgress thin">
            <div className="analyticsCommandProgressBar">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
        <small>{sampleFootnote}</small>
      </div>
    </section>
  );
}
