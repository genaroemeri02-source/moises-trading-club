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

export function AnalyticsEdgeHero({ edgeData }) {
  if (!edgeData) return null;
  const { score, sentence, subline, confidence, chips, sampleFootnote } = edgeData;
  const tone = confidenceTone[confidence?.tier] || 'neutral';
  const progressTarget = confidence?.count < 5 ? 5 : ANALYTICS_MIN_SAMPLE;
  const progressPct = Math.min(100, Math.round((confidence?.count || 0) / progressTarget * 100));
  const showProgress = confidence?.count < ANALYTICS_MIN_SAMPLE;

  return (
    <section className="analyticsHero">
      <div className="analyticsHeroMain">
        <div className="analyticsHeroScore">
          <div
            className="analyticsEdgeScoreRing command"
            style={{ '--score-pct': score, '--ring-color': scoreRingColor(score) }}
          >
            <div className="analyticsEdgeScoreRingInner">
              <b className="analyticsEdgeScoreValue">{score}</b>
              <span className="analyticsEdgeScoreMax">/100</span>
            </div>
          </div>
          <span className="analyticsHeroScoreLabel">Score operativo</span>
        </div>

        <div className="analyticsHeroCenter">
          <h2 className="analyticsHeroHeadline">{sentence}</h2>
          {subline && <p className="analyticsHeroSubline">{subline}</p>}
        </div>

        {chips && (
          <div className="analyticsHeroSummary">
            <div className="analyticsHeroSummaryRow positive">
              <span>Edge</span>
              <b>{chips.edge}</b>
              <small>{chips.edgeValue}</small>
            </div>
            <div className="analyticsHeroSummaryRow negative">
              <span>Fuga</span>
              <b>{chips.leak}</b>
              <small>{chips.leakValue}</small>
            </div>
            <div className="analyticsHeroSummaryRow neutral">
              <span>Confianza</span>
              <b>{confidence?.label || '—'}</b>
            </div>
          </div>
        )}
      </div>

      <div className="analyticsHeroFoot">
        {showProgress && (
          <div className="analyticsHeroProgress">
            <div className="analyticsEdgeProgressBar">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
        <small className="analyticsHeroSample">{sampleFootnote}</small>
        <em className={`analyticsConfidenceBadge ${tone}`}>{confidence?.label}</em>
      </div>
    </section>
  );
}
