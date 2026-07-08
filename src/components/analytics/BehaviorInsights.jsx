import { AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { pickBehaviorFocus, getBehaviorReading } from '../../lib/analyticsUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

export function BehaviorInsights({ insights, stats, hasSample }) {
  const behaviorAvg = insights?.behaviorAvg || stats?.behaviorAvg || 0;
  const scoreRounded = Math.round(behaviorAvg);
  const scoreTone = scoreRounded >= 70 ? 'positive' : scoreRounded >= 50 ? 'neutral' : 'negative';
  const focus = pickBehaviorFocus(insights, stats);
  const behaviorReading = getBehaviorReading(scoreRounded);

  return (
    <div className="analyticsBehaviorCompact">
      <div className="analyticsBehaviorCompactHead">
        <h4>Conducta operativa</h4>
        <p>Disciplina y ejecución en la muestra.</p>
      </div>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin conducta" text="Completá campos en Journal." />
      ) : (
        <div className="analyticsBehaviorCompactBody">
          <div className={`analyticsBehaviorCompactScore ${scoreTone}`}>
            <div className="analyticsBehaviorCompactScoreVal">
              <b>{scoreRounded}</b>
              <em>/100</em>
            </div>
            <p className="analyticsBehaviorCompactHeadline">{behaviorReading}</p>
          </div>

          {(focus.sustain || focus.correct) && (
            <div className="analyticsBehaviorCompactFocus">
              {focus.sustain && (
                <div className="analyticsBehaviorCompactFocusItem positive">
                  <ThumbsUp size={11} />
                  <div>
                    <span>Sostener</span>
                    <b>{focus.sustain.name}</b>
                  </div>
                </div>
              )}
              {focus.correct && (
                <div className="analyticsBehaviorCompactFocusItem negative">
                  <ThumbsDown size={11} />
                  <div>
                    <span>Corregir</span>
                    <b>{focus.correct.name}</b>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="analyticsBehaviorCompactMetrics">
            <div className="analyticsBehaviorCompactMetric">
              <CheckCircle2 size={10} />
              <div><span>Plan</span><b>{`${Number(stats?.planFollowedPct || stats?.discipline || 0).toFixed(0)}%`}</b></div>
            </div>
            <div className="analyticsBehaviorCompactMetric">
              <AlertCircle size={10} />
              <div><span>Impulsivos</span><b>{stats?.impulseTrades ?? 0}</b></div>
            </div>
            <div className="analyticsBehaviorCompactMetric">
              <CheckCircle2 size={10} />
              <div><span>Buenas pérdidas</span><b>{stats?.goodLosses ?? 0}</b></div>
            </div>
            <div className="analyticsBehaviorCompactMetric">
              <AlertCircle size={10} />
              <div><span>Malas ganancias</span><b>{stats?.badWins ?? 0}</b></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
