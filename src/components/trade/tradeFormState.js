import { toNumberSafe } from '../../lib/tradeUtils.js';

export function autoResultR(next = {}) {
  const rm = toNumberSafe(next.resultMoney);
  const risk = toNumberSafe(next.riskMoney);
  return risk > 0 ? String(Number((rm / Math.abs(risk)).toFixed(2))) : next.resultR;
}

export function createTradeFormChangeHandler(setForm) {
  return (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    if (k === 'account') localStorage.setItem('mtc-last-account', v || 'Cuenta principal');
    if (k === 'date') {
      const day = String(v || '').slice(0, 10);
      next.date = day;
      next.tradingDay = day;
    }
    if (['resultMoney', 'riskMoney'].includes(k)) next.resultR = autoResultR(next);
    if (k === 'entry' || k === 'exit') {
      const entry = toNumberSafe(next.entry);
      const ex = toNumberSafe(next.exit);
      const side = next.side || 'BUY';
      if (entry && ex && toNumberSafe(next.resultPct) === 0) {
        next.resultPct = String(Number((((side === 'BUY' ? ex - entry : entry - ex) / entry) * 100).toFixed(2)));
      }
    }
    return next;
  });
}
