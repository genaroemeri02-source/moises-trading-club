import React from 'react';
import { formatMoneyCompactCard, formatR } from '../../lib/formatUtils.js';
import { Card } from '../ui/Card.jsx';

export function OperationalHeatmap({ matrix = [] }) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  return (
    <Card title="Heatmap operativo" sub="Sesiones ordenadas por actividad real." className="dashboardHeatmapCard">
      <div className="dashboardHeatmapMatrix">
        <span />
        {days.map(day => <b key={day}>{day}</b>)}
        {matrix.map(row => (
          <React.Fragment key={row.session}>
            <strong>{row.session}</strong>
            {row.cells.map(cell => (
              <i
                key={`${row.session}-${cell.day}`}
                className={cell.tone}
                title={`${row.session} · ${cell.day} · ${cell.count ? `${cell.count} op · ${formatR(cell.avgR)} · ${formatMoneyCompactCard(cell.total)}` : 'Sin operaciones'}`}
              >
                {cell.count ? <em>{formatR(cell.avgR)}</em> : null}
              </i>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="dashboardHeatmapLegend">
        <span><i className="positive" />R positivo</span>
        <span><i className="negative" />R negativo</span>
        <span><i />Sin operaciones</span>
      </div>
    </Card>
  );
}
