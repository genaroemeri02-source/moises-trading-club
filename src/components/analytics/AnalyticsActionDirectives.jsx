import { Repeat2, Scissors, Search, Shield } from 'lucide-react';

const DIRECTIVE_ICONS = {
  Repetir: Repeat2,
  Recortar: Scissors,
  Investigar: Search,
  Proteger: Shield
};

export function AnalyticsActionDirectives({ directives, compact = false }) {
  if (!directives) return null;
  const items = [
    directives.repeat,
    directives.reduce || directives.cut,
    directives.investigate,
    directives.protect
  ].filter(Boolean);

  return (
    <section className={`analyticsDirectives analyticsTier2Block analyticsDirectivesBoard analyticsSurfaceSupport ${compact ? 'analyticsDirectivesRail' : ''}`}>
      <header className="analyticsDirectivesRailHead">
        <span>Directivas operativas</span>
        <em>Consecuencia del mapa</em>
      </header>
      <div className="analyticsDirectivesGrid analyticsDirectivesGrid--x4">
        {items.map((item) => {
          const Icon = DIRECTIVE_ICONS[item.label] || Search;
          const toneClass = item.tone === 'positive' ? 'tone-edge'
            : item.tone === 'negative' ? 'tone-leak'
            : item.tone === 'warn' ? 'tone-observe'
            : 'tone-neutral';
          const setup = item.setup || item.title;
          const evidence = item.evidence || item.line || item.metric;
          const action = item.action || item.motive;

          return (
            <article key={item.type || item.label} className={`analyticsDirectiveCard ${toneClass}`}>
              <header className="analyticsDirectiveHead">
                <Icon size={11} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </header>
              <b className="analyticsDirectiveSetup" title={setup}>{setup}</b>
              {!compact && (
                <>
                  {evidence && <p className="analyticsDirectiveEvidence">{evidence}</p>}
                  {(item.confidence || item.status || item.reading || item.reason) && (
                    <p className="analyticsDirectiveVerdict">{item.confidence || item.status || item.reading || item.reason}</p>
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
