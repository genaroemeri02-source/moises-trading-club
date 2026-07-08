import { ANALYTICS_MIN_SAMPLE } from '../../lib/analyticsUtils.js';

const confidenceTone = {
  insufficient: 'warn',
  initial: 'neutral',
  interpretable: 'good',
  solid: 'good'
};

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
  const tone = confidenceTone[confidence?.tier] || 'neutral';
  const progressTarget = confidence?.count < 5 ? 5 : ANALYTICS_MIN_SAMPLE;
  const progressPct = Math.min(100, Math.round((confidence?.count || 0) / progressTarget * 100));
  const showProgress = confidence?.count < ANALYTICS_MIN_SAMPLE;
  const headline = commandCopy?.headline || edgeData.diagnosis || edgeData.sentence;
  const weeklyAction = commandCopy?.weeklyAction || edgeData.weeklyAction;
  const subline = commandCopy?.subline || edgeData.subline;

  return (
    <section className="analyticsCommand">
      <div className="analyticsCommandMain">
        <div className="analyticsCommandScore">
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

        <div className="analyticsCommandNarrative">
          <span className="analyticsCommandEyebrow">Diagnóstico ejecutivo</span>
          <h2 className="analyticsCommandHeadline">{headline}</h2>
          {weeklyAction && (
            <div className="analyticsCommandActionRow">
              <span>Acción semanal</span>
              <p>{weeklyAction}</p>
            </div>
          )}
          {subline && <p className="analyticsCommandSub">{subline}</p>}
        </div>

        {chips && (
          <div className="analyticsCommandSignals">
            <div className="analyticsCommandSignal positive">
              <span>Edge activo</span>
              <b>{chips.edge}</b>
              <small>{chips.edgeValue}</small>
            </div>
            <div className="analyticsCommandSignal negative">
              <span>Fuga principal</span>
              <b>{chips.leak}</b>
              <small>{chips.leakValue}</small>
            </div>
            <div className="analyticsCommandSignal neutral">
              <span>Confianza de lectura</span>
              <b>{confidence?.label || '—'}</b>
            </div>
          </div>
        )}
      </div>

      <div className="analyticsCommandFoot">
        {showProgress && (
          <div className="analyticsCommandProgress">
            <div className="analyticsCommandProgressBar">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
        <small>{sampleFootnote}</small>
        <em className={`analyticsCommandConfidence ${tone}`}>{confidence?.label}</em>
      </div>
    </section>
  );
}
