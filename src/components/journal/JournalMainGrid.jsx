import { JournalDailyPlanSection } from './JournalDailyPlanSection.jsx';
import { JournalTradesList } from './JournalTradesList.jsx';
import { JournalCalendarCard } from './JournalCalendarCard.jsx';

export function JournalMainGrid({
  dailyPlanPanel,
  trades,
  onOpenTrade,
  onDeleteTrade,
  onExportTrade,
  onShareTrade,
  onNewTrade,
  calendarTrades,
  selectedDate,
  onSelectCalendarDay,
  dayPlan,
}) {
  return (
    <div className="journalMainGrid">
      <div className="journalMainLeft">
        <JournalDailyPlanSection dailyPlanPanel={dailyPlanPanel} />
        <JournalTradesList
          trades={trades}
          onOpenTrade={onOpenTrade}
          onDeleteTrade={onDeleteTrade}
          onExportTrade={onExportTrade}
          onShareTrade={onShareTrade}
          onNewTrade={onNewTrade}
        />
      </div>
      <aside className="journalMainRight">
        <JournalCalendarCard
          trades={calendarTrades}
          selectedDate={selectedDate}
          onSelectDay={onSelectCalendarDay}
          dayPlan={dayPlan}
        />
      </aside>
    </div>
  );
}
