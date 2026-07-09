import { TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

const CARD_META = {
  edge: {
    id: 'edge',
    label: 'Edge activo',
    icon: TrendingUp,
    tone: 'edge'
  },
  leak: {
    id: 'leak',
    label: 'Fuga principal',
    icon: TrendingDown,
    tone: 'leak'
  },
  action: {
    id: 'action',
    label: 'Acción semanal',
    icon: Target,
    tone: 'action'
  },
  confidence: {
    id: 'confidence',
    label: 'Confiabilidad',
    icon: Shield,
    tone: 'confidence'
  }
};

function DiagnosisCard({ meta, title, detail, sampleTone }) {
  const Icon = meta.icon;
  const toneClass = meta.id === 'confidence'
    ? `tone-${sampleTone || 'neutral'}`
    : `tone-${meta.tone}`;

  return (
    <article className={`analyticsDiagnosisCard ${toneClass}`}>
      <header className="analyticsDiagnosisCardHead">
        <span className="analyticsDiagnosisCardIcon" aria-hidden="true">
          <Icon size={13} strokeWidth={2.25} />
        </span>
        <span className="analyticsDiagnosisCardLabel">{meta.label}</span>
      </header>
      <b className="analyticsDiagnosisCardTitle" title={title}>{title}</b>
      {detail && <p className="analyticsDiagnosisCardDetail">{detail}</p>}
    </article>
  );
}

/**
 * Sprint 02 — Diagnóstico ejecutivo (regla del minuto).
 * 4 cards: edge / fuga / acción semanal / confiabilidad.
 * Consume diagnosis + sample de buildAnalyticsIntelligence.
 */
export function AnalyticsExecutiveDiagnosis({
  diagnosis = null,
  sample = null,
  onGoJournal = null
}) {
  if (!diagnosis) return null;

  const quality = sample?.quality || diagnosis.sampleQuality || 'insufficient';
  const sampleTone = sample?.tone || 'warn';
  const showFormationHint = quality === 'insufficient' || quality === 'observing';
  const progressPct = Math.min(100, Number(sample?.progressPct || 0));
  const progressLabel = sample?.message || diagnosis.confidenceDetail;

  const cards = [
    {
      meta: CARD_META.edge,
      title: diagnosis.edgeTitle,
      detail: diagnosis.edgeDetail
    },
    {
      meta: CARD_META.leak,
      title: diagnosis.leakTitle,
      detail: diagnosis.leakDetail
    },
    {
      meta: CARD_META.action,
      title: diagnosis.weeklyAction,
      detail: quality === 'insufficient'
        ? 'Prioridad: completar muestra usable antes de escalar riesgo.'
        : 'Una acción concreta para esta semana.'
    },
    {
      meta: CARD_META.confidence,
      title: diagnosis.confidenceLabel || sample?.label || 'Muestra insuficiente',
      detail: diagnosis.confidenceDetail || sample?.message
    }
  ];

  return (
    <section
      className="analyticsExecutiveDiagnosis analyticsTier1 analyticsSurfaceFlagship"
      aria-label="Diagnóstico ejecutivo"
    >
      <header className="analyticsExecutiveDiagnosisHead">
        <div className="analyticsExecutiveDiagnosisHeadMain">
          <span className="analyticsExecutiveDiagnosisEyebrow">Diagnóstico ejecutivo</span>
          <h2 className="analyticsExecutiveDiagnosisTitle">
            Edge, fuga y acción en menos de un minuto
          </h2>
        </div>
        <span className={`analyticsExecutiveDiagnosisBadge tone-${sampleTone}`}>
          {sample?.short || diagnosis.confidenceLabel || 'Muestra'}
        </span>
      </header>

      <div className="analyticsDiagnosisGrid">
        {cards.map((card) => (
          <DiagnosisCard
            key={card.meta.id}
            meta={card.meta}
            title={card.title}
            detail={card.detail}
            sampleTone={sampleTone}
          />
        ))}
      </div>

      {showFormationHint && (
        <footer className="analyticsExecutiveDiagnosisFoot">
          <div className="analyticsDiagnosisProgress" aria-hidden={progressPct <= 0}>
            <div className="analyticsDiagnosisProgressBar">
              <span style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <small>{progressLabel}</small>
          {onGoJournal && quality === 'insufficient' && (
            <button type="button" className="ghost compact" onClick={onGoJournal}>
              Ir al Journal
            </button>
          )}
        </footer>
      )}
    </section>
  );
}
