import { Plus } from 'lucide-react';
import { JournalTradeRow } from './JournalTradeRow.jsx';

export function JournalTradesList({
  trades,
  onOpenTrade,
  onDeleteTrade,
  onExportTrade,
  onShareTrade,
  onNewTrade,
}) {
  return (
    <div className="table journalTradesTable">
      {trades.map((trade) => (
        <JournalTradeRow
          key={trade.id}
          trade={trade}
          onOpen={() => onOpenTrade(trade)}
          onDelete={() => onDeleteTrade(trade)}
          onExport={onExportTrade}
          onShare={() => onShareTrade(trade)}
        />
      ))}
      {!trades.length && (
        <div className="empty">
          <span className="emptyIcon"><Plus size={18} /></span>
          <h3>Sin trades en esta jornada</h3>
          <p>Elegí otra fecha o registrá una nueva operación para este día.</p>
          <button className="ghost compact" onClick={onNewTrade}>Nuevo trade</button>
        </div>
      )}
    </div>
  );
}
