import {
  formatSetupLabel,
  buildEdgeLabPipeline,
  pickActiveThesis,
  prioritizeInsufficientSetups,
  prioritizeLeakSetups,
  SETUP_VALIDATION_TARGET
} from '../../lib/analyticsUtils.js';
import { formatMoneyClean, formatPercentCard, formatR } from '../../lib/formatUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

function PipelineListItem({ item }) {
  const plTone = item.value >= 0 ? 'pos' : 'neg';
  return (
    <li className="analyticsPipelineItem">
      <span className="analyticsPipelineItemName" title={item.name}>{item.label}</span>
      <span className={`analyticsPipelineItemPl ${plTone}`}>{formatMoneyClean(item.value)}</span>
      <span className="analyticsPipelineItemMeta">
        {item.count} trade{item.count === 1 ? '' : 's'} · {item.status}
      </span>
    </li>
  );
}

function ActiveThesisCard({ thesis }) {
  if (!thesis) return null;
  const { row, tier, reading, progress } = thesis;
  const label = formatSetupLabel(row.name);
  const plTone = row.value >= 0 ? 'pos' : 'neg';
  const metrics = [
    formatMoneyClean(row.value),
    `${row.count} trade${row.count === 1 ? '' : 's'}`,
    `${formatR(row.avgR)} prom.`
  ];
  if (row.winrate > 0) metrics.push(`${formatPercentCard(row.winrate)} acierto`);

  return (
    <article className={`analyticsEdgeThesis ${tier}`}>
      <div className="analyticsEdgeThesisHead">
        <span>Tesis activa</span>
        <em className={tier}>{tier === 'validated' ? 'Validado' : 'Observación'}</em>
      </div>
      <b className="analyticsEdgeThesisName" title={row.name}>{label}</b>
      <p className="analyticsEdgeThesisMetrics">
        {metrics.map((part, i) => (
          <span key={i} className={i === 0 ? plTone : undefined}>{part}</span>
        ))}
      </p>
      <div className="analyticsEdgeThesisProgress">
        <div className="analyticsEdgeThesisProgressBar">
          <span style={{ width: `${progress.pct}%` }} />
        </div>
        <small>{progress.current}/{SETUP_VALIDATION_TARGET} trades para validar muestra</small>
      </div>
      <p className="analyticsEdgeThesisReading">{reading}</p>
    </article>
  );
}

function LeakItem({ item }) {
  return (
    <article className="analyticsLeakPanelItem">
      <b title={item.name}>{item.label}</b>
      <span className="neg">{formatMoneyClean(item.value)} · {item.count} trade{item.count === 1 ? '' : 's'}</span>
      <em>Acción: Reducir exposición</em>
    </article>
  );
}

export function EdgeLab({ setupRows = [], trades = [], hasSample }) {
  const thesis = pickActiveThesis(setupRows, trades);
  const pipeline = buildEdgeLabPipeline(setupRows);
  const { visible: insufficientVisible, overflow: insufficientOverflow } =
    prioritizeInsufficientSetups(pipeline.insufficient, 4);
  const leaksVisible = prioritizeLeakSetups(pipeline.leaks, 2);

  return (
    <section className="analyticsEdgeLab">
      <header className="analyticsEdgeLabHead">
        <h3>Laboratorio de edge</h3>
        <p>Validación de setups, muestra y calidad de repetición.</p>
      </header>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin setups" text="Registrá trades con setup." />
      ) : (
        <>
          {thesis ? (
            <ActiveThesisCard thesis={thesis} />
          ) : (
            <div className="analyticsEdgeThesisEmpty">
              <b>Sin tesis activa</b>
              <p>Necesitás al menos 3 trades por setup para iniciar observación.</p>
            </div>
          )}

          <div className="analyticsEdgeLabBody">
            <div className="analyticsValidationPipeline">
              <header className="analyticsValidationPipelineHead">
                <h4>Pipeline de validación</h4>
                <p>Setups que necesitan repetición antes de concluir.</p>
              </header>

              <div className="analyticsPipelineBlock">
                <h5>En observación</h5>
                {pipeline.observation.length ? (
                  <ul className="analyticsPipelineList">
                    {pipeline.observation.map((item) => (
                      <PipelineListItem key={item.name} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="analyticsPipelineEmpty">Sin setups en observación activa.</p>
                )}
              </div>

              <div className="analyticsPipelineBlock">
                <h5>Sin muestra suficiente</h5>
                {insufficientVisible.length ? (
                  <ul className="analyticsPipelineList">
                    {insufficientVisible.map((item) => (
                      <PipelineListItem key={item.name} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="analyticsPipelineEmpty">Todos los setups tienen muestra mínima.</p>
                )}
                {insufficientOverflow > 0 && (
                  <p className="analyticsPipelineOverflow">
                    +{insufficientOverflow} setup{insufficientOverflow === 1 ? '' : 's'} pendiente{insufficientOverflow === 1 ? '' : 's'} de muestra
                  </p>
                )}
              </div>
            </div>

            <div className="analyticsRiskPanel">
              <header className="analyticsRiskPanelHead">
                <h4>Riesgo operativo</h4>
              </header>

              <div className="analyticsLeakPanel">
                <h5>Fugas a controlar</h5>
                {leaksVisible.length ? (
                  <div className="analyticsLeakPanelList">
                    {leaksVisible.map((item) => (
                      <LeakItem key={item.name} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="analyticsPipelineEmpty">Sin fugas activas en la muestra.</p>
                )}
              </div>

              <div className="analyticsValidationCriteria">
                <span>Validado = {SETUP_VALIDATION_TARGET}+ trades</span>
                <span>Observación = 3–9 trades</span>
                <span>Insuficiente = &lt;3 trades</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
