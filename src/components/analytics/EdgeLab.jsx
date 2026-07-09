import {
  formatSetupLabel,
  buildEdgeLabPipeline,
  pickActiveThesis,
  prioritizeLeakSetups,
  buildUpcomingEdgeSamples,
  SETUP_VALIDATION_TARGET
} from '../../lib/analyticsUtils.js';
import { formatMoneyClean, formatPercentCard, formatR } from '../../lib/formatUtils.js';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

function CompactSampleRow({ item }) {
  const plTone = item.value >= 0 ? 'pos' : 'neg';
  return (
    <li className="analyticsEdgePipelineCompactItem">
      <div className="analyticsEdgePipelineCompactItemBody">
        <span className="analyticsEdgePipelineCompactName" title={item.name}>{item.label}</span>
        <span className="analyticsEdgePipelineCompactMeta">
          {item.count} trade{item.count === 1 ? '' : 's'} · {item.status}
        </span>
      </div>
      <span className={`analyticsEdgePipelineCompactPl ${plTone}`}>{formatMoneyClean(item.value)}</span>
    </li>
  );
}

function CompactLeakRow({ item }) {
  return (
    <li className="analyticsActiveLeaksCompactItem">
      <div className="analyticsActiveLeaksCompactItemBody">
        <span className="analyticsActiveLeaksCompactName" title={item.name}>{item.label}</span>
        <span className="analyticsActiveLeaksCompactMeta">
          {item.count} trade{item.count === 1 ? '' : 's'}
        </span>
        <em>Reducir exposición</em>
      </div>
      <span className="analyticsActiveLeaksCompactPl neg">{formatMoneyClean(item.value)}</span>
    </li>
  );
}

function EdgeIntelligenceMap({ thesis }) {
  if (!thesis) {
    return (
      <div className="analyticsEdgeMapZone empty">
        <span className="analyticsEdgeMapZoneLabel">Mapa de edge</span>
        <div className="analyticsEdgeMapCoreEmpty">
          <b>Sin setup activo</b>
          <p>Necesitás al menos 3 trades por setup para iniciar observación.</p>
        </div>
      </div>
    );
  }

  const { row, tier, reading, progress } = thesis;
  const label = formatSetupLabel(row.name);
  const plTone = row.value >= 0 ? 'pos' : 'neg';

  return (
    <div className={`analyticsEdgeMapZone ${tier}`}>
      <span className="analyticsEdgeMapZoneLabel">Mapa de edge</span>

      <div className="analyticsEdgeMapStage">
        <div className="analyticsEdgeMapGlow" aria-hidden="true" />

        <div className="analyticsEdgeMapCanvas">
          <span className="analyticsEdgeMapConnector tl" aria-hidden="true" />
          <span className="analyticsEdgeMapConnector tr" aria-hidden="true" />
          <span className="analyticsEdgeMapConnector bl" aria-hidden="true" />
          <span className="analyticsEdgeMapConnector br" aria-hidden="true" />

          <div className={`analyticsEdgeMapMetric satellite tl ${plTone}`}>
            <small>P/L</small>
            <b>{formatMoneyClean(row.value)}</b>
          </div>
          <div className="analyticsEdgeMapMetric satellite tr">
            <small>Trades</small>
            <b>{row.count}</b>
          </div>
          <div className="analyticsEdgeMapMetric satellite bl">
            <small>R prom.</small>
            <b>{formatR(row.avgR)}</b>
          </div>
          <div className="analyticsEdgeMapMetric satellite br">
            <small>Acierto</small>
            <b>{row.winrate > 0 ? formatPercentCard(row.winrate) : '—'}</b>
          </div>

          <div className="analyticsEdgeMapCore">
            <div className="analyticsEdgeMapRingWrap">
              <div
                className="analyticsEdgeMapRing"
                style={{ '--map-pct': progress.pct }}
                aria-hidden="true"
              >
                <div className="analyticsEdgeMapRingInner">
                  <b>{progress.current}</b>
                  <span>/{SETUP_VALIDATION_TARGET}</span>
                </div>
              </div>
            </div>
            <span className="analyticsEdgeMapCoreLabel">Setup activo</span>
            <b className="analyticsEdgeMapCoreName" title={row.name}>{label}</b>
            <div className="analyticsValidationTrack">
              <div className="analyticsValidationTrackHead">
                <span>Validación</span>
                <strong>{progress.current}/{SETUP_VALIDATION_TARGET}</strong>
              </div>
              <div className="analyticsValidationTrackBar">
                <span style={{ width: `${progress.pct}%` }} />
              </div>
              <small>{progress.current} de {SETUP_VALIDATION_TARGET} trades para validar</small>
            </div>
          </div>
        </div>
      </div>

      <p className="analyticsEdgeMapReading integrated">{reading}</p>
    </div>
  );
}

export function EdgeLab({ setupRows = [], trades = [], hasSample }) {
  const thesis = pickActiveThesis(setupRows, trades);
  const pipeline = buildEdgeLabPipeline(setupRows);
  const activeName = thesis?.row?.name || '';
  const { visible: upcomingSamples, overflow: samplesOverflow } =
    buildUpcomingEdgeSamples(pipeline, activeName, 4);
  const leaksVisible = prioritizeLeakSetups(pipeline.leaks, 2);
  const statusLabel = thesis?.tier === 'validated' ? 'Validado' : thesis ? 'En observación' : null;

  return (
    <section className="analyticsEdgeLab analyticsSurfaceFlagship analyticsEdgeLabUnified">
      <header className="analyticsEdgeLabHead">
        <div className="analyticsEdgeLabHeadCopy">
          <h3>Laboratorio de edge</h3>
          <p>Validación, fugas y muestra pendiente en un solo mapa.</p>
        </div>
        {statusLabel && (
          <em className={`analyticsEdgeLabStatus ${thesis?.tier || ''}`}>{statusLabel}</em>
        )}
      </header>

      {!hasSample ? (
        <AnalyticsSectionEmpty compact title="Sin setups" text="Registrá trades con setup." />
      ) : (
        <div className="analyticsEdgeLabCanvas">
          <EdgeIntelligenceMap thesis={thesis} />

          <div className="analyticsEdgeLabBase">
            <div className="analyticsEdgePipelineCompact integrated">
              <div className="analyticsEdgePipelineCompactCol samples">
                <header className="analyticsEdgePipelineCompactHead">
                  <h4>Próximas muestras</h4>
                  <span>Cola de muestra</span>
                </header>
                {upcomingSamples.length ? (
                  <ul className="analyticsEdgePipelineCompactList">
                    {upcomingSamples.map((item) => (
                      <CompactSampleRow key={item.name} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="analyticsEdgePipelineCompactEmpty">Sin otros setups en cola.</p>
                )}
                {samplesOverflow > 0 && (
                  <p className="analyticsEdgePipelineCompactMore">
                    +{samplesOverflow} setup{samplesOverflow === 1 ? '' : 's'} pendiente{samplesOverflow === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              <div className="analyticsEdgePipelineCompactCol leaks">
                <header className="analyticsEdgePipelineCompactHead">
                  <h4>Fugas activas</h4>
                  <span>Cola de riesgo</span>
                </header>
                {leaksVisible.length ? (
                  <ul className="analyticsActiveLeaksCompactList">
                    {leaksVisible.map((item) => (
                      <CompactLeakRow key={item.name} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="analyticsEdgePipelineCompactEmpty">Sin fugas activas en la muestra.</p>
                )}
              </div>
            </div>

            <p className="analyticsValidationCriteriaInline integrated">
              Validado {SETUP_VALIDATION_TARGET}+ trades · Observación 3–9 · Insuficiente: menor a 3
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
