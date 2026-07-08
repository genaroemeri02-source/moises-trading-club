import { AnalyticsKpiCard } from './AnalyticsKpiCard.jsx';

export function AnalyticsKpiStrip({ readings, hasSample }) {
  if (!hasSample || !readings) return null;
  const r = readings;

  return (
    <section className="analyticsSystemHealth">
      <div className="analyticsSystemHealthGrid">
        <AnalyticsKpiCard
          label="Profit Factor"
          value={r.profitFactor.value.replace(/^PF\s*/, '')}
          sub={r.profitFactor.reading}
          hint={r.profitFactor.hint}
          state={r.profitFactor.state}
          variant="health"
        />
        <AnalyticsKpiCard
          label="P/L neto"
          value={r.netPl.value}
          sub={r.netPl.reading}
          state={r.netPl.state}
        />
        <AnalyticsKpiCard
          label="Expectativa"
          value={r.expectancy.value}
          sub={r.expectancy.reading}
          state={r.expectancy.state}
        />
        <AnalyticsKpiCard
          label="Drawdown"
          value={r.drawdown.value}
          sub={r.drawdown.reading}
          hint={r.drawdown.sub}
          state={r.drawdown.state}
        />
        <AnalyticsKpiCard
          label="Winrate"
          value={r.winrate.value}
          sub={r.winrate.reading}
          state={r.winrate.state}
        />
        <AnalyticsKpiCard
          label="Disciplina"
          value={r.discipline.value}
          sub={r.discipline.reading}
          state={r.discipline.state}
        />
        <AnalyticsKpiCard
          label="Trades"
          value={r.trades.value}
          sub={r.trades.reading}
          state={r.trades.state}
        />
      </div>
    </section>
  );
}
