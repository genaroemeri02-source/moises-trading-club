import { ANALYTICS_MIN_SAMPLE } from '../../lib/analyticsUtils.js';

function scoreRingColor(score) {
  if (score >= 70) return '#33E6C4';
  if (score >= 45) return '#7C5CFF';
  return '#9C97B8';
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
    <section className="analyticsCommand analyticsCommandStrip analyticsCommandHeroV14 analyticsTier1 analyticsSurfaceFlagship">
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
            <div className="analyticsCommandWeeklyBlock">
              <span className="analyticsCommandWeeklyLabel">Acción semanal</span>
              <p className="analyticsCommandWeeklyInline">{weeklyAction}</p>
            </div>
          )}
        </div>

        {chips && (
          <div className="analyticsCommandChips" aria-label="Señales compactas">
            <div className="analyticsCommandChip positive">
              <span>Edge</span>
              <b title={chips.edge}>{chips.edge}</b>
            </div>
            <div className="analyticsCommandChip negative">
              <span>Fuga</span>
              <b title={chips.leak}>{chips.leak}</b>
            </div>
            <div className="analyticsCommandChip neutral">
              <span>Confianza</span>
              <b title={confidence?.label || '—'}>{confidence?.label || '—'}</b>
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
