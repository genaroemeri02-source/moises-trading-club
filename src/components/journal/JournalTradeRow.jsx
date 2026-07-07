import { Download, Share2, Trash2 } from 'lucide-react';
import { money, pct } from '../../lib/formatUtils.js';
import { accountName, normalizeTradeSetup, safeArray } from '../../lib/tradeUtils.js';

export function JournalTradeRow({ trade, onOpen, onDelete, onExport, onShare }) {
  const value = Number(trade.resultMoney || 0);
  const pctVal = Number(trade.resultPct || 0);
  const rVal = Number(trade.resultR || 0);
  const confluencesUsed = safeArray(trade.confluencesUsed);
  return (
    <div
      className="trade tradePro clickableTrade journalTradeRow"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <div className="journalTradeMain">
        <div className="journalTradeHead">
          <b className="journalTradeSymbol">{trade.asset}</b>
          <div className="journalTradeTags">
            <span className={trade.side === 'BUY' ? 'buy' : 'sell'}>{trade.side}</span>
            <span className="quality">{trade.quality}</span>
          </div>
        </div>
        <p className="journalTradeMeta">
          {accountName(trade)} · {trade.date} · {trade.session} · {trade.tradeSystem || 'Sistema'} · {trade.pattern || normalizeTradeSetup(trade) || trade.otherSystem}
          {confluencesUsed.length ? ` · ${confluencesUsed.length} confluencias` : ''}
        </p>
      </div>
      <div className={value > 0 ? 'journalTradeResult tradeResult pos' : value < 0 ? 'journalTradeResult tradeResult neg' : 'journalTradeResult tradeResult'}>
        <strong>{value > 0 ? '+' : ''}{money(value)}</strong>
        <small>{pctVal > 0 ? '+' : ''}{pct(pctVal)} · {rVal > 0 ? '+' : ''}{rVal.toFixed(2)}R</small>
      </div>
      <div className="tradeExportActions journalTradeActions" onClick={(e) => e.stopPropagation()}>
        <button className="ghost compact shareReviewButton journalTradeActionBtn" onClick={onShare} title="Compartir revisión">
          <Share2 size={14} />Revisión
        </button>
        <button className="ghost compact journalTradeActionBtn" onClick={() => onExport(trade, 'json')} title="Exportar JSON">
          <Download size={14} />JSON
        </button>
        <button className="ghost compact journalTradeActionBtn" onClick={() => onExport(trade, 'csv')} title="Exportar CSV">
          <Download size={14} />CSV
        </button>
        <button className="ghost compact journalTradeActionBtn journalTradeActionDelete" onClick={onDelete} title="Borrar trade" aria-label="Borrar trade">
          <Trash2 size={14} />Eliminar
        </button>
      </div>
    </div>
  );
}
