import React from 'react';
import { MtcScoreCard } from './MtcScoreCard.jsx';
import { PnlCumulativeChartCard } from './PnlCumulativeChartCard.jsx';
import { OperationalHeatmap } from './OperationalHeatmap.jsx';

export function DashboardAdvancedInsights({ s, disciplineScore, hasProfitFactorSample, hasWinLossSample, dailyCurve, heatmapMatrix }) {
  return (
    <section className="dashboardInsightsSection">
      <div className="dashboardInsightsHead">
        <div>
          <span>Analítica avanzada</span>
          <h3>Insights operativos</h3>
          <p>Score, curva mensual y sesiones para leer ventaja sin repetir los KPIs ejecutivos.</p>
        </div>
      </div>
      <div className="dashboardInsightsGrid">
        <MtcScoreCard s={s} disciplineScore={disciplineScore} hasProfitFactorSample={hasProfitFactorSample} hasWinLossSample={hasWinLossSample} />
        <PnlCumulativeChartCard curve={dailyCurve} />
        <OperationalHeatmap matrix={heatmapMatrix} />
      </div>
    </section>
  );
}
