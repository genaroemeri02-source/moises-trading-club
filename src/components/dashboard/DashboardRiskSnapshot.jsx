import React from 'react';
import { formatCalendarR, formatMoneyCompactCard } from '../../lib/formatUtils.js';

function yn(value, yes = 'Sí', no = 'No', unknown = '—') {
  if (value === true) return yes;
  if (value === false) return no;
  return unknown;
}

export function DashboardRiskSnapshot({ operationalState, emotionIntelligence }) {
  const inputs = operationalState?.inputs || {};
  const tradesToday = Number(inputs.tradesToday || 0);
  const maxTrades = Number(inputs.maxTradesPerDay || 0) || '—';
  const dailyR = Number(inputs.dailyR || 0);
  const weeklyR = Number(inputs.weeklyR || 0);
  const emotionalRisk = inputs.emotionalRisk
    || emotionIntelligence?.operationalSignals?.emotionalRisk
    || 'unknown';
  const emotionalLabel = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    unknown: 'Sin datos'
  }[emotionalRisk] || 'Sin datos';

  const cells = [
    {
      label: 'Trades hoy',
      value: `${tradesToday}/${maxTrades}`,
      sub: inputs.dailyLossLimitHit ? 'Límite diario activo' : 'Cupo diario'
    },
    {
      label: 'R diario',
      value: formatCalendarR(dailyR),
      sub: formatMoneyCompactCard(inputs.dailyPnl || 0),
      tone: dailyR < 0 ? 'neg' : dailyR > 0 ? 'pos' : ''
    },
    {
      label: 'R semanal',
      value: formatCalendarR(weeklyR),
      sub: formatMoneyCompactCard(inputs.weeklyPnl || 0),
      tone: weeklyR < 0 ? 'neg' : weeklyR > 0 ? 'pos' : ''
    },
    {
      label: 'Hard stop',
      value: yn(!!inputs.dailyLossLimitHit || !!inputs.weeklyLossLimitHit, 'Activo', 'Libre'),
      sub: inputs.drawdownLimitHit ? 'DD límite' : 'Dentro de reglas'
    },
    {
      label: 'Checklist',
      value: yn(inputs.checklistComplete, 'Completo', 'Pendiente', 'Base'),
      sub: 'Validación pre-entrada'
    },
    {
      label: 'Riesgo emocional',
      value: emotionalLabel,
      sub: emotionalRisk === 'unknown' ? 'Sin check-ins suficientes' : 'Señal operativa',
      tone: emotionalRisk === 'high' ? 'neg' : emotionalRisk === 'medium' ? 'warn' : emotionalRisk === 'low' ? 'pos' : ''
    }
  ];

  return (
    <section className="dashboardRiskSnapshot">
      <header className="dashboardRiskSnapshotHead">
        <span>Riesgo y límites</span>
        <b>Snapshot operativo</b>
      </header>
      <div className="dashboardRiskSnapshotGrid">
        {cells.map(cell => (
          <div key={cell.label} className={cell.tone || undefined}>
            <span>{cell.label}</span>
            <b>{cell.value}</b>
            <small>{cell.sub}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
