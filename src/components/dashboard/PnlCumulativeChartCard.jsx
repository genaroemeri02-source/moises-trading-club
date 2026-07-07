import React from 'react';
import { formatMoneyCompactCard } from '../../lib/formatUtils.js';
import { Card } from '../ui/Card.jsx';
import { DashboardChartFallback, MtcLightweightLineChart } from './MtcLightweightLineChart.jsx';

export function PnlCumulativeChartCard({ curve = [] }) {
  const hasData = curve.length >= 2;
  const last = curve[curve.length - 1]?.value || 0;
  let peak = 0;
  let maxDrawdown = 0;
  curve.forEach(point => {
    peak = Math.max(peak, Number(point.value || 0));
    maxDrawdown = Math.max(maxDrawdown, peak - Number(point.value || 0));
  });
  return (
    <Card title="P/L neto acumulado" sub={hasData ? `Mes actual · ${formatMoneyCompactCard(last)} acumulado` : 'Curva en formación · requiere al menos 2 días operados.'} className="dashboardCumulativeCard">
      {hasData ? (
        <>
          <div className="dashboardCumulativeHeader">
            <div><span>Cierre actual</span><b>{formatMoneyCompactCard(last)}</b></div>
            <div><span>Drawdown máx.</span><b className="negative">{formatMoneyCompactCard(-Math.abs(maxDrawdown))}</b></div>
          </div>
          <MtcLightweightLineChart data={curve} mode="pnl" height={292} currency={formatMoneyCompactCard} />
        </>
      ) : <DashboardChartFallback />}
    </Card>
  );
}
