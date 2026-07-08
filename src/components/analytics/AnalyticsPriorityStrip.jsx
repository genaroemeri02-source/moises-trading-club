import { Repeat, Scissors, Eye } from 'lucide-react';

const icons = { repeat: Repeat, cut: Scissors, watch: Eye };

export function AnalyticsPriorityStrip({ priorities }) {
  if (!priorities) return null;
  const items = [
    { key: 'repeat', label: 'Qué repetir', data: priorities.repeat },
    { key: 'cut', label: 'Qué recortar', data: priorities.cut },
    { key: 'watch', label: 'Qué vigilar', data: priorities.watch }
  ].filter(x => x.data);

  return (
    <section className="analyticsPriorityStrip compact">
      <div className="analyticsPriorityGrid">
        {items.map(({ key, label, data }) => {
          const Icon = icons[key];
          return (
            <article key={key} className={`analyticsPriorityCard compact ${data.tone || 'neutral'}`}>
              <div className="analyticsPriorityCardTop">
                <Icon size={14} />
                <span>{label}</span>
              </div>
              <b className="analyticsPriorityTitle" title={data.title}>{data.title}</b>
              <small className="analyticsTextMuted">{data.meta}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
