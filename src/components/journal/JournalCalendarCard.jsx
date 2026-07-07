import { Card } from '../ui/Card.jsx';
import { TradingMonthCalendar } from '../dashboard/TradingCalendarPanel.jsx';

export function JournalCalendarCard({ trades, selectedDate, onSelectDay, dayPlan }) {
  return (
    <Card
      className="journalCalendarCard"
      title="Calendario mensual de jornadas"
      sub="Profit, Stop Loss y Breakeven por resultado neto de cada jornada. Click para abrir una jornada."
    >
      <TradingMonthCalendar
        trades={trades}
        selectedDate={selectedDate}
        variant="detailed"
        onSelectDay={onSelectDay}
      />
      {dayPlan && (
        <div className="dayPlanSummary">
          <b>Plan guardado</b>
          <p>{dayPlan.bias || 'Sin sesgo'} · {dayPlan.maxRisk || 'Sin riesgo definido'}</p>
        </div>
      )}
    </Card>
  );
}
