import React, { useEffect, useState } from 'react';
import {
  money, formatMoneyCompactCard, formatMoneyClean, formatCalendarMoney, formatCalendarR, formatCalendarPct
} from '../../lib/formatUtils.js';
import { tradingDayKey, monthKey } from '../../lib/dateUtils.js';
import {
  calendarDayR, calendarToneFromTotal, groupTradesByDay, buildTradingCalendarWeeks
} from '../../lib/analyticsUtils.js';
import { Card } from '../ui/Card.jsx';
import { latestTradeFromStats } from './dashboardUtils.js';

export function TradingMonthCalendar({ trades = [], selectedDate, onSelectDay, variant = 'detailed', initialKey }) {
  const [key, setKey] = useState((initialKey || selectedDate || tradingDayKey()).slice(0, 7));
  useEffect(() => {
    if (!selectedDate) return;
    const month = selectedDate.slice(0, 7);
    setKey(prev => prev === month ? prev : month);
  }, [selectedDate]);
  const stats = groupTradesByDay(trades);
  const weeks = buildTradingCalendarWeeks(key, stats);
  const monthStats = Object.values(stats).filter(x => x.date.slice(0, 7) === key);
  const total = monthStats.reduce((a, b) => a + b.total, 0);
  const totalR = monthStats.reduce((a, b) => a + calendarDayR(b), 0);
  const monthLabel = new Date(key + '-02T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const compact = variant === 'compact';
  const prev = () => { const d = new Date(key + '-02T12:00:00'); d.setMonth(d.getMonth() - 1); setKey(d.toISOString().slice(0, 7)); };
  const next = () => { const d = new Date(key + '-02T12:00:00'); d.setMonth(d.getMonth() + 1); setKey(d.toISOString().slice(0, 7)); };
  return (
    <div className={`tradingCalendar ${variant} ${compact ? 'compact' : 'detailed'}`}>
      <div className="tradingCalendarHead">
        <button className="ghost compact" onClick={prev}>‹</button>
        <div><b>{monthLabel}</b><small>{monthStats.length} días operados · {formatMoneyCompactCard(total)} · {formatCalendarR(totalR)}</small></div>
        <button className="ghost compact" onClick={next}>›</button>
      </div>
      <div className="tradingCalendarGrid">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Semana'].map(label => <span className="tradingCalendarLabel" key={label}>{label}</span>)}
        {weeks.map(week => (
          <React.Fragment key={`week-${week.index}`}>
            {week.days.map((date, dayIndex) => {
              if (!date) return <span key={`blank-${week.index}-${dayIndex}`} className="tradingDayCell empty" />;
              const st = stats[date];
              const tone = st ? calendarToneFromTotal(st.total) : 'none';
              const dayR = calendarDayR(st);
              return (
                <button
                  key={date}
                  className={`tradingDayCell ${tone} ${selectedDate === date ? 'selected' : ''}`}
                  disabled={!st && compact}
                  onClick={() => { if (st || !compact) onSelectDay?.(date, st); }}
                  title={st ? `${date} · ${money(st.total)} · ${formatCalendarR(dayR)} · ${st.count} trade${st.count > 1 ? 's' : ''}` : date}
                >
                  <b>{Number(date.slice(-2))}</b>
                  {st && <span className="tradingDayResult"><strong>{formatCalendarMoney(st.total)}</strong><small>{formatCalendarR(dayR)}</small></span>}
                </button>
              );
            })}
            <div className={`tradingWeekSummary ${week.summary.count ? calendarToneFromTotal(week.summary.total) : 'none'}`}>
              <span>Semana {week.index}</span>
              {week.summary.count ? (
                <>
                  <strong>{formatCalendarMoney(week.summary.total)}</strong>
                  <small>{week.summary.pctCount ? formatCalendarPct(week.summary.pct) : formatCalendarR(week.summary.r)}</small>
                  {!compact && week.summary.pctCount > 0 && <em>{formatCalendarR(week.summary.r)}</em>}
                </>
              ) : <small>Sin trades</small>}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="tradingCalendarLegend">
        <span><i className="win" />Profit</span>
        <span><i className="loss" />Stop Loss</span>
        <span><i className="be" />Breakeven</span>
      </div>
    </div>
  );
}

export function CalendarHeatmapPreview({ trades = [], setTab, initial = 0 }) {
  const stats = groupTradesByDay(trades);
  const monthStats = Object.values(stats).filter(x => x.date.slice(0, 7) === monthKey());
  const total = monthStats.reduce((a, b) => a + b.total, 0);
  const totalR = monthStats.reduce((a, b) => a + calendarDayR(b), 0);
  const monthPct = Number(initial || 0) ? total / Number(initial || 0) * 100 : 0;
  const monthLabel = new Date(monthKey() + '-02T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const openDay = (d, st) => {
    localStorage.setItem('mtc-open-journal-date', d);
    const latest = latestTradeFromStats(st);
    if (latest?.id) localStorage.setItem('mtc-open-trade', latest.id);
    setTab?.('journal');
  };
  return (
    <Card
      title="Calendario P/L"
      sub={`${monthLabel} · ${monthStats.length} día${monthStats.length === 1 ? '' : 's'} operado${monthStats.length === 1 ? '' : 's'} · ${total >= 0 ? '+' : ''}${formatMoneyClean(total)} · ${formatCalendarPct(monthPct)} · ${formatCalendarR(totalR)}`}
      className="calendarPreviewCard dashboardCalendarHero"
    >
      <TradingMonthCalendar trades={trades} variant="dashboard" initialKey={monthKey()} onSelectDay={openDay} />
    </Card>
  );
}
