import { ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  getSessionReading,
  pickBehaviorFocus,
  getBehaviorReading
} from '../../lib/analyticsUtils.js';
import { formatMoneyClean } from '../../lib/formatUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

export function OperatingProfile({ sessionRows = [], behaviorData, stats, hasSample, totalTrades = 0, compact = false }) {
  const visible = (sessionRows || []).filter(r => r.count > 0);
  const reading = getSessionReading(sessionRows, totalTrades);
  const singleSession = visible.length === 1;
  const session = singleSession ? visible[0] : null;
  const share = session && totalTrades ? Math.round((session.count / totalTrades) * 100) : 0;
  const behaviorAvg = behaviorData?.behaviorAvg || stats?.behaviorAvg || 0;
  const scoreRounded = Math.round(behaviorAvg);
  const scoreTone = scoreRounded >= 70 ? 'positive' : scoreRounded >= 50 ? 'neutral' : 'negative';
  const focus = pickBehaviorFocus(behaviorData, stats);
  const behaviorReading = getBehaviorReading(scoreRounded);

  const sectionClass = [
    'analyticsOperatingProfile',
    'analyticsTier3Block',
    'complement',
    'analyticsSurfaceSupport',
    compact ? 'compact-side' : ''
  ].filter(Boolean).join(' ');

  return (
    <section className={sectionClass}>
      <header className="analyticsOperatingProfileHead">
        <h3>Perfil operativo</h3>
        {!compact && <p>Cobertura de sesión, conducta y sesgo de ejecución.</p>}
      </header>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin perfil" text="Registrá trades para construir perfil." />
      ) : compact ? (
        <div className="analyticsOperatingProfileBody compact dense complement side-stack">
          {!visible.length ? (
            <p className="analyticsOperatingProfileNote">Sin sesiones en la muestra.</p>
          ) : singleSession ? (
            <>
              <b className="analyticsOperatingProfileHeadline">
                {reading?.headline || `Perfil concentrado en ${session?.name}`}
              </b>
              <p className="analyticsOperatingProfileData">
                {totalTrades} trade{totalTrades === 1 ? '' : 's'} · {share}% de la muestra
              </p>
              <div className="analyticsOperatingProfileBar inline" aria-hidden="true">
                <span style={{ width: `${share}%` }} />
              </div>
            </>
          ) : (
            <div className="analyticsOperatingProfileSessions compact-sessions">
              {visible.slice(0, 3).map(row => {
                const rowShare = totalTrades ? Math.round((row.count / totalTrades) * 100) : 0;
                return (
                  <article key={row.name} className="analyticsOperatingProfileSessionRow">
                    <div>
                      <span>{row.name}</span>
                      <small>{row.count}T · {rowShare}%</small>
                    </div>
                    <b className={row.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(row.value)}</b>
                  </article>
                );
              })}
            </div>
          )}

          <div className={`analyticsOperatingProfileScore instrument inline-score ${scoreTone}`}>
            <div
              className="analyticsOperatingProfileScoreDial"
              style={{ '--score-pct': scoreRounded }}
              aria-hidden="true"
            >
              <div className="analyticsOperatingProfileScoreDialInner">
                <b>{scoreRounded}</b>
                <em>/100</em>
              </div>
            </div>
            <div className="analyticsOperatingProfileScoreCopy">
              <span className="analyticsOperatingProfileLabel">Conducta</span>
              <p>{behaviorReading}</p>
            </div>
          </div>

          {(focus.sustain || focus.correct) && (
            <div className="analyticsOperatingProfileFocus compact-focus">
              {focus.sustain && (
                <div className="positive">
                  <ThumbsUp size={9} />
                  <div>
                    <span>Sostiene</span>
                    <b>{focus.sustain.name}</b>
                  </div>
                </div>
              )}
              {focus.correct && (
                <div className="negative">
                  <ThumbsDown size={9} />
                  <div>
                    <span>Amenaza</span>
                    <b>{focus.correct.name}</b>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="analyticsOperatingProfileMetrics compact-metrics">
            <div><span>Plan</span><b>{`${Number(stats?.planFollowedPct || stats?.discipline || 0).toFixed(0)}%`}</b></div>
            <div><span>Impulsivos</span><b>{stats?.impulseTrades ?? 0}</b></div>
            <div><span>Buenas pérdidas</span><b>{stats?.goodLosses ?? 0}</b></div>
            <div><span>Malas ganancias</span><b>{stats?.badWins ?? 0}</b></div>
          </div>
        </div>
      ) : (
        <div className="analyticsOperatingProfileBody compact dense complement">
          <div className="analyticsOperatingProfileGrid">
          <div className="analyticsOperatingProfileSession">
            <span className="analyticsOperatingProfileLabel">Cobertura de sesión</span>
            {!visible.length ? (
              <p className="analyticsOperatingProfileNote">Sin sesiones en la muestra.</p>
            ) : singleSession ? (
              <>
                <b className="analyticsOperatingProfileHeadline">
                  {reading?.headline || `Perfil concentrado en ${session?.name}`}
                </b>
                <p className="analyticsOperatingProfileData">
                  {totalTrades} trade{totalTrades === 1 ? '' : 's'} · {share}% de la muestra
                </p>
                <div className="analyticsOperatingProfileBar" aria-hidden="true">
                  <span style={{ width: `${share}%` }} />
                </div>
                <em className="analyticsOperatingProfileBadge warn">Cobertura limitada</em>
                <p className="analyticsOperatingProfileNote">
                  {reading?.note || 'No hay comparación real entre sesiones.'}
                </p>
              </>
            ) : (
              <div className="analyticsOperatingProfileSessions">
                {visible.map(row => {
                  const rowShare = totalTrades ? Math.round((row.count / totalTrades) * 100) : 0;
                  return (
                    <article key={row.name} className="analyticsOperatingProfileSessionRow">
                      <div>
                        <span>{row.name}</span>
                        <small>{row.count}T · {rowShare}%</small>
                      </div>
                      <b className={row.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(row.value)}</b>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="analyticsOperatingProfileBehavior">
            <span className="analyticsOperatingProfileLabel">Conducta operativa</span>
            <div className={`analyticsOperatingProfileScore instrument ${scoreTone}`}>
              <div
                className="analyticsOperatingProfileScoreDial"
                style={{ '--score-pct': scoreRounded }}
                aria-hidden="true"
              >
                <div className="analyticsOperatingProfileScoreDialInner">
                  <b>{scoreRounded}</b>
                  <em>/100</em>
                </div>
              </div>
              <div className="analyticsOperatingProfileScoreCopy">
                <p>{behaviorReading}</p>
              </div>
            </div>

            {(focus.sustain || focus.correct) && (
              <div className="analyticsOperatingProfileFocus">
                {focus.sustain && (
                  <div className="positive">
                    <ThumbsUp size={10} />
                    <div>
                      <span>Sostiene</span>
                      <b>{focus.sustain.name}</b>
                    </div>
                  </div>
                )}
                {focus.correct && (
                  <div className="negative">
                    <ThumbsDown size={10} />
                    <div>
                      <span>Amenaza</span>
                      <b>{focus.correct.name}</b>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="analyticsOperatingProfileMetrics">
              <div><span>Plan</span><b>{`${Number(stats?.planFollowedPct || stats?.discipline || 0).toFixed(0)}%`}</b></div>
              <div><span>Impulsivos</span><b>{stats?.impulseTrades ?? 0}</b></div>
              <div><span>Buenas pérdidas</span><b>{stats?.goodLosses ?? 0}</b></div>
              <div><span>Malas ganancias</span><b>{stats?.badWins ?? 0}</b></div>
            </div>
          </div>
          </div>
        </div>
      )}
    </section>
  );
}
