import {
  groupSetupsForValidation,
  classifySetupConfidence,
  formatSetupLabel,
  formatSetupProfitFactor,
  buildValidationProgress,
  buildSetupObservationReading,
  pickPrimaryObservationSetup
} from '../../lib/analyticsUtils.js';
import { formatMoneyClean, formatPercentCard, formatR } from '../../lib/formatUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

function SetupMiniMetrics({ row, inline = false }) {
  if (inline) {
    const parts = [
      `${row.count} trade${row.count === 1 ? '' : 's'}`,
      formatMoneyClean(row.value),
      `${formatR(row.avgR)} promedio`
    ];
    if (row.winrate > 0) parts.push(`${formatPercentCard(row.winrate)} acierto`);
    return <p className="analyticsEdgeCandidateMetrics">{parts.join(' · ')}</p>;
  }
  return (
    <div className="analyticsSetupMiniMetrics">
      <div className="analyticsSetupMiniMetric">
        <span>Trades</span>
        <b>{row.count}</b>
      </div>
      <div className="analyticsSetupMiniMetric">
        <span>P/L</span>
        <b className={row.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(row.value)}</b>
      </div>
      <div className="analyticsSetupMiniMetric">
        <span>R prom.</span>
        <b>{formatR(row.avgR)}</b>
      </div>
      {row.winrate > 0 && (
        <div className="analyticsSetupMiniMetric">
          <span>Acierto</span>
          <b>{formatPercentCard(row.winrate)}</b>
        </div>
      )}
    </div>
  );
}

function SetupPrimaryCard({ row, tier = 'validated' }) {
  const label = formatSetupLabel(row.name);
  const conf = classifySetupConfidence(row.count);
  const pf = formatSetupProfitFactor(row);
  const showPf = pf.display !== '—';
  const pfWeak = row.count < 10;

  return (
    <article className={`analyticsSetupPrimaryCard ${tier}`}>
      <div className="analyticsSetupPrimaryHead">
        <b className="analyticsSetupPrimaryName" title={row.name}>{label}</b>
        <span className={`analyticsSetupPrimaryBadge ${tier}`}>{conf.shortLabel}</span>
      </div>
      <SetupMiniMetrics row={row} />
      {showPf && (
        <small className={`analyticsSetupPrimaryPf ${pfWeak ? 'weak' : ''}`}>
          PF {pf.display}{pfWeak ? ' · PF no robusto' : ''}
        </small>
      )}
    </article>
  );
}

function EdgeCandidateCard({ row }) {
  const label = formatSetupLabel(row.name);
  const progress = buildValidationProgress(row.count);
  const reading = buildSetupObservationReading(row);

  return (
    <article className="analyticsEdgeCandidate">
      <div className="analyticsEdgeCandidateHead">
        <span className="analyticsEdgeCandidateLabel">Edge en observación</span>
        <em className="analyticsEdgeCandidateBadge">Observación</em>
      </div>
      <b className="analyticsEdgeCandidateName" title={row.name}>{label}</b>
      <SetupMiniMetrics row={row} inline />
      <div className="analyticsValidationProgress">
        <div className="analyticsValidationProgressBar">
          <span style={{ width: `${progress.pct}%` }} />
        </div>
        <small>{progress.label}</small>
      </div>
      <p className="analyticsEdgeCandidateReading">{reading}</p>
    </article>
  );
}

export function PendingSetupsBlock({ rows = [] }) {
  if (!rows.length) return null;

  return (
    <div className="analyticsPendingSetups">
      <div className="analyticsPendingSetupsHead">
        <b>Muestra pendiente</b>
        <span>
          {rows.length} setup{rows.length === 1 ? '' : 's'} todavía no {rows.length === 1 ? 'tiene' : 'tienen'} trades suficientes para lectura confiable.
        </span>
      </div>
      <div className="analyticsPendingSetupsFlow">
        {rows.map(row => {
          const plTone = row.value > 0 ? 'pos' : row.value < 0 ? 'neg' : 'neutral';
          return (
            <div key={row.name} className="analyticsPendingSetupChip" title={row.name}>
              <span className="analyticsPendingSetupName">{formatSetupLabel(row.name)}</span>
              <span className="analyticsPendingSetupCount">{row.count}T</span>
              <span className={`analyticsPendingSetupPl ${plTone}`}>
                {formatMoneyClean(row.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PendingSetupsBlock as InsufficientSetupsBlock };

export function SetupBreakdown({ rows = [], hasSample }) {
  const { validated, observation, insufficient } = groupSetupsForValidation(rows);
  const primaryObservation = pickPrimaryObservationSetup(observation);
  const hasEdgeContent = validated.length > 0 || observation.length > 0;

  return (
    <div className="analyticsEdgeValidation">
      <div className="analyticsEdgeValidationHead">
        <h4>Edge en validación</h4>
        <p>Robustez por setup y progreso hacia muestra validada.</p>
      </div>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin setups" text="Registrá trades con setup." />
      ) : !hasEdgeContent && !insufficient.length ? (
        <AnalyticsSectionEmpty compact title="Sin setups" text="Ajustá filtros." />
      ) : (
        <div className="analyticsEdgeValidationBody">
          {validated.length > 0 && (
            <div className="analyticsSetupGroup validated">
              <span className="analyticsSetupGroupLabel">Setups validados</span>
              <div className="analyticsSetupPrimaryList">
                {validated.map(row => (
                  <SetupPrimaryCard key={row.name} row={row} tier="validated" />
                ))}
              </div>
            </div>
          )}

          {validated.length === 0 && primaryObservation && (
            <EdgeCandidateCard row={primaryObservation} />
          )}

          {validated.length === 0 && observation.length > 1 && (
            <div className="analyticsSetupGroup observation">
              <span className="analyticsSetupGroupLabel">Otros en observación</span>
              <div className="analyticsSetupPrimaryList compact">
                {observation.filter(r => r.name !== primaryObservation?.name).map(row => (
                  <SetupPrimaryCard key={row.name} row={row} tier="observation" />
                ))}
              </div>
            </div>
          )}

          {validated.length > 0 && observation.length > 0 && (
            <div className="analyticsSetupGroup observation">
              <span className="analyticsSetupGroupLabel">En observación</span>
              <div className="analyticsSetupPrimaryList compact">
                {observation.map(row => (
                  <SetupPrimaryCard key={row.name} row={row} tier="observation" />
                ))}
              </div>
            </div>
          )}

          {!validated.length && !primaryObservation && !hasEdgeContent && insufficient.length > 0 && (
            <AnalyticsSectionEmpty compact title="Sin edge en observación" text="Necesitás al menos 3 trades por setup para iniciar validación." />
          )}
        </div>
      )}
    </div>
  );
}
