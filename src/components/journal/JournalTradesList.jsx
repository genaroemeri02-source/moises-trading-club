import { Plus } from 'lucide-react';
import { JournalTradeRow } from './JournalTradeRow.jsx';

export function JournalTradesList({
  trades,
  onOpenTrade,
  onDeleteTrade,
  onExportTrade,
  onShareTrade,
  onNewTrade,
  totalTradeCount,
}) {
  const dayEmpty = !trades.length;
  const isActivationEmpty = dayEmpty && Number(totalTradeCount || 0) === 0;

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
      {isActivationEmpty && (
        <div className="empty emptyStateActivation">
          <span className="emptyIcon"><Plus size={18} /></span>
          <h3>Tu diagnóstico empieza con tus primeras ejecuciones.</h3>
          <p>Registrá tu primer trade para activar evidencia operativa. Con 10 trades, MTC puede detectar edge, fuga y acción semanal.</p>
          <button className="primary compact" onClick={onNewTrade}>Registrar primer trade</button>
        </div>
      )}
      {dayEmpty && !isActivationEmpty && (
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
