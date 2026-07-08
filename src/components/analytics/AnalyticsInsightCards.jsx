import { Repeat2, Scissors, Search } from 'lucide-react';

const ACTION_ICONS = {
  Repetir: Repeat2,
  Recortar: Scissors,
  Investigar: Search,
  Vigilar: Search
};

export function AnalyticsInsightCards({ cards }) {
  if (!cards) return null;
  const items = [cards.repeat, cards.cut, cards.watch].filter(Boolean);

  return (
    <section className="analyticsActionBoard">
      <div className="analyticsActionBoardGrid">
        {items.map((card) => {
          const verdict = card.status || card.reading;
          const Icon = ACTION_ICONS[card.label] || Eye;
          return (
            <article key={card.label} className={`analyticsActionCard ${card.tone || 'neutral'}`}>
              <div className="analyticsActionCardTop">
                <Icon size={14} strokeWidth={2} aria-hidden="true" />
                <span className="analyticsActionLabel">{card.label}</span>
              </div>
              <b className="analyticsActionTitle" title={card.setup}>{card.setup}</b>
              <small className="analyticsActionData">{card.line}</small>
              {verdict && (
                <em className={`analyticsActionVerdict ${card.tone || 'neutral'}`}>{verdict}</em>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
