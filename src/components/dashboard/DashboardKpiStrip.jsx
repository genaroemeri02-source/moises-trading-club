import React from 'react';
import {
  formatMoneyCompactCard, formatPercentCard, formatMetricCard, formatCalendarR
} from '../../lib/formatUtils.js';
import {
  DashboardKpiCard, MiniSparkline, KpiBars, KpiMiniGauge, KpiStreakDots
} from './DashboardKpiCard.jsx';

export function DashboardKpiStrip({
  s,
  monthly,
  dailyCurve,
  spark,
  winLossTotal,
  avgWinLoss,
  avgWinLossSub,
  payoffWin,
  payoffLoss,
  payoffTotal,
  profitFactor,
  profitFactorSub,
  hasProfitFactorSample,
  profitFactorGauge,
  streakValue,
  streakSub,
  streakInfo,
  expectancyValue,
  expectancySub,
  expectancyGauge
}) {
  return (
    <div className="metrics premiumMetricGrid dashboardKpiStrip">
      <DashboardKpiCard label="P/L neto" value={formatMoneyCompactCard(monthly.total)} sub={`${formatMetricCard(monthly.days)} día${monthly.days === 1 ? '' : 's'} · ${formatCalendarR(monthly.r)}`} state={monthly.total >= 0 ? 'positive' : 'negative'} meta="Mes" visual={<MiniSparkline data={dailyCurve.length ? dailyCurve.map(x => x.value) : spark} tone={monthly.total >= 0 ? 'positive' : 'negative'} />} />
      <DashboardKpiCard label="Efectividad" value={formatPercentCard(s.winrate)} sub={`${s.wins} ganada${s.wins === 1 ? '' : 's'} · ${s.losses} pérdida${s.losses === 1 ? '' : 's'} · ${s.breakeven} BE`} state={s.winrate >= 50 ? 'positive' : 'neutral'} meta="Win rate" visual={<KpiBars items={[{ value: s.wins / winLossTotal * 100, tone: 'positive', label: 'Ganadas' }, { value: s.losses / winLossTotal * 100, tone: 'negative', label: 'Perdidas' }, { value: s.breakeven / winLossTotal * 100, tone: 'neutral', label: 'BE' }]} />} />
      <DashboardKpiCard label="Ratio G/P" value={avgWinLoss} sub={avgWinLossSub} state={s.payoffRatio >= 1 ? 'positive' : 'neutral'} meta="Payoff" visual={<KpiBars items={[{ value: payoffWin / payoffTotal * 100, tone: 'positive', label: 'Ganador promedio' }, { value: payoffLoss / payoffTotal * 100, tone: 'negative', label: 'Perdedor promedio' }]} />} />
      <DashboardKpiCard label="Factor de beneficio" value={profitFactor} sub={profitFactorSub} state={hasProfitFactorSample && Number(s.profitFactor || 0) >= 1.5 ? 'positive' : 'neutral'} meta="Sistema" visual={<KpiMiniGauge value={profitFactorGauge} tone={hasProfitFactorSample && Number(s.profitFactor || 0) >= 1.5 ? 'positive' : 'neutral'} />} />
      <DashboardKpiCard label="Racha actual" value={streakValue} sub={streakSub} state={streakInfo.sign > 0 ? 'positive' : streakInfo.sign < 0 ? 'negative' : 'neutral'} meta="Momentum" visual={<KpiStreakDots count={streakInfo.count} sign={streakInfo.sign} />} />
      <DashboardKpiCard label="Expectativa" value={expectancyValue} sub={expectancySub} state={s.count >= 10 && Number(s.meanR || 0) > 0 ? 'positive' : s.count >= 10 && Number(s.meanR || 0) < 0 ? 'negative' : 'neutral'} meta="Muestra" visual={<KpiBars items={[{ value: expectancyGauge, tone: s.count >= 10 && Number(s.meanR || 0) < 0 ? 'negative' : 'positive', label: 'Estabilidad' }, { value: Math.max(4, 100 - expectancyGauge), tone: 'neutral', label: 'Pendiente' }]} />} />
    </div>
  );
}
