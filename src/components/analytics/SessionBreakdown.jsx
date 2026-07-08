import { formatMoneyClean, formatPercentCard, formatMetricCard } from '../../lib/formatUtils.js';
import { getSessionReading } from '../../lib/analyticsUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

export function SessionBreakdown({ rows = [], hasSample, totalTrades = 0 }) {
  const visible = (rows || []).filter(r => r.count > 0);
  const reading = getSessionReading(rows, totalTrades);
  const singleSession = visible.length === 1;
  const session = singleSession ? visible[0] : null;
  const share = session && totalTrades ? Math.round((session.count / totalTrades) * 100) : 0;

  return (
    <div className="analyticsCoverageCard">
      <div className="analyticsCoverageHead">
        <h4>Cobertura de sesión</h4>
        <p>Distribución de la muestra por horario.</p>
      </div>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin sesiones" text="Registrá trades con sesión." />
      ) : !visible.length ? (
        <AnalyticsSectionEmpty compact title="Sin sesiones" text="Ajustá filtros." />
      ) : singleSession ? (
        <div className="analyticsSessionConcentration single">
          <div className="analyticsSessionConcentrationTop">
            <b>{reading?.headline}</b>
            <em className="analyticsCoverageBadge warn">Cobertura limitada</em>
          </div>
          {reading?.expandNote && (
            <span className="analyticsSessionConcentrationData">{reading.expandNote}</span>
          )}
          <div className="analyticsSessionConcentrationBar" aria-hidden="true">
            <span style={{ width: `${share}%` }} />
          </div>
          <small className="analyticsSessionConcentrationLabel">{session?.name} {share}%</small>
          <p>{reading?.note}</p>
        </div>
      ) : (
        <div className="analyticsSessionDistribution">
          {visible.map(row => {
            const rowShare = totalTrades ? Math.round((row.count / totalTrades) * 100) : 0;
            return (
              <article key={row.name} className="analyticsSessionDistRow">
                <div className="analyticsSessionDistTop">
                  <span>{row.name}</span>
                  <b className={row.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(row.value)}</b>
                </div>
                <div className="analyticsSessionConcentrationBar inline" aria-hidden="true">
                  <span style={{ width: `${rowShare}%` }} />
                </div>
                <small>{formatMetricCard(row.count)} trades · {formatPercentCard(row.winrate)} · {rowShare}%</small>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
