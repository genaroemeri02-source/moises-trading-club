import { Repeat2, Scissors, Search } from 'lucide-react';

const DIRECTIVE_ICONS = {
  Repetir: Repeat2,
  Recortar: Scissors,
  Investigar: Search
};

export function AnalyticsActionDirectives({ directives, compact = false }) {
  if (!directives) return null;
  const items = [directives.repeat, directives.cut, directives.investigate].filter(Boolean);

  return (
    <section className={`analyticsDirectives analyticsTier2Block analyticsDirectivesBoard analyticsSurfaceSupport ${compact ? 'analyticsDirectivesRail' : ''}`}>
      <header className="analyticsDirectivesRailHead">
        <span>Directivas operativas</span>
        <em>Consecuencia del mapa</em>
      </header>
      <div className="analyticsDirectivesGrid">
        {items.map((item) => {
          const Icon = DIRECTIVE_ICONS[item.label] || Search;
          const toneClass = item.tone === 'positive' ? 'tone-edge'
            : item.tone === 'negative' ? 'tone-leak'
            : item.tone === 'warn' ? 'tone-observe'
            : 'tone-neutral';
          const action = item.action || item.motive;

          return (
            <article key={item.label} className={`analyticsDirectiveCard ${toneClass}`}>
              <header className="analyticsDirectiveHead">
                <Icon size={11} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </header>
              <b className="analyticsDirectiveSetup" title={item.setup}>{item.setup}</b>
              {!compact && (
                <>
                  <p className="analyticsDirectiveEvidence">{item.evidence || item.line}</p>
                  {(item.confidence || item.status || item.reading) && (
                    <p className="analyticsDirectiveVerdict">{item.confidence || item.status || item.reading}</p>
                  )}
                </>
              )}
              {action && <p className="analyticsDirectiveAction">{action}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
