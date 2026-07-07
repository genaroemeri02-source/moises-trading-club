import { getTradeOperationalDateKey, normalizeDateKey, today, daysInMonth } from './dateUtils.js';
import { toNumberSafe, safeArray, normalizeTradeSetup, tradeDayKey, isClosedEvaluableTrade, normalizedText } from './tradeUtils.js';
import { formatMoneyClean, formatMetricCard, pct } from './formatUtils.js';

export function behaviorScoreFromTrade(t = {}) {
  let score = 70;
  const b = safeArray(t.executionBehaviors);
  if (t.followedPlan === true || b.includes('Seguí el plan')) score += 15;
  if (b.includes('Respeté el riesgo')) score += 10;
  if (t.postTradeBehavior === 'Buena ejecución') score += 10;
  if (t.postTradeBehavior === 'Aprendizaje claro') score += 5;
  if (b.includes('Dudé antes de entrar')) score -= 5;
  if (b.includes('Entré tarde')) score -= 12;
  if (b.includes('Me anticipé')) score -= 18;
  if (b.includes('Moví el stop')) score -= 22;
  if (b.includes('Cerré antes de tiempo')) score -= 12;
  if (b.includes('Sobreoperé')) score -= 25;
  if (b.includes('Operé por impulso')) score -= 30;
  if (t.postTradeBehavior === 'Rompí reglas') score -= 25;
  if (t.emotionBefore === 'Ansioso' || t.emotionBefore === 'Apurado' || t.emotionBefore === 'Frustrado' || t.emotionBefore === 'Eufórico') score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function behaviorScoreLabel(score) { return score >= 90 ? 'Ejecución disciplinada' : score >= 70 ? 'Buena ejecución' : score >= 50 ? 'Ejecución irregular' : 'Operación impulsiva'; }

export function tradeFollowedPlan(t = {}) {
  const raw = normalizedText(t.followedPlan);
  if (t.followedPlan === true || ['si', 'sí', 'yes', 'true', 'cumplido', 'seguido'].includes(raw)) return true;
  const behaviors = [...safeArray(t.executionBehaviors), t.postTradeBehavior].map(normalizedText);
  return behaviors.some(x => x.includes('segui el plan') || x.includes('ejecucion disciplinada'));
}

export function realizedRValue(t = {}) {
  const moneyVal = toNumberSafe(t.resultMoney);
  const riskVal = Math.abs(toNumberSafe(t.riskMoney));
  const rawR = Number(String(t.resultR ?? '').replace(',', '.'));
  let r = 0;

  if (riskVal > 0 && Number.isFinite(moneyVal)) {
    r = moneyVal / riskVal;
  } else if (Number.isFinite(rawR)) {
    r = rawR;
  }

  if (!Number.isFinite(r)) r = 0;

  if (moneyVal > 0 && r < 0) r = Math.abs(r);
  if (moneyVal < 0 && r > 0) r = -Math.abs(r);
  if (moneyVal === 0) r = 0;

  if (Math.abs(r) > 25) return 0;
  return r;
}

export const calendarDayR = dayStats => (dayStats?.trades || []).reduce((sum, t) => sum + toNumberSafe(t.resultR), 0);
export const calendarDayPct = dayStats => (dayStats?.trades || []).reduce((sum, t) => sum + toNumberSafe(t.resultPct), 0);
export const calendarToneFromTotal = value => Number(value || 0) > 0 ? 'win' : Number(value || 0) < 0 ? 'loss' : 'be';

export function groupTradesByDay(trades = []) {
  return trades.reduce((acc, t) => {
    const date = getTradeOperationalDateKey(t);
    if (!date) return acc;
    if (!acc[date]) acc[date] = { date, total: 0, count: 0, wins: 0, losses: 0, trades: [] };
    const v = toNumberSafe(t.resultMoney);
    acc[date].total += v;
    acc[date].count += 1;
    if (v > 0) acc[date].wins += 1;
    if (v < 0) acc[date].losses += 1;
    acc[date].trades.push(t);
    return acc;
  }, {});
}

export function buildTradingCalendarWeeks(key, stats = {}) {
  const rows = [];
  const cells = daysInMonth(key);
  for (let i = 0; i < cells.length; i += 7) {
    const weekdays = cells.slice(i, i + 5);
    const weekStats = weekdays.reduce((acc, date) => {
      const st = date ? stats[date] : null;
      if (!st) return acc;
      const r = calendarDayR(st), pctValue = calendarDayPct(st);
      acc.total += st.total;
      acc.r += r;
      acc.pct += pctValue;
      acc.pctCount += (st.trades || []).filter(t => String(t.resultPct ?? '').trim() !== '').length;
      acc.count += st.count;
      acc.wins += st.total > 0 ? 1 : 0;
      acc.losses += st.total < 0 ? 1 : 0;
      acc.breakevens += st.total === 0 ? 1 : 0;
      acc.trades.push(...(st.trades || []));
      return acc;
    }, { total: 0, r: 0, pct: 0, pctCount: 0, count: 0, wins: 0, losses: 0, breakevens: 0, trades: [] });
    rows.push({ index: rows.length + 1, days: weekdays, summary: weekStats });
  }
  return rows;
}

const qualityScore = { 'A+': 100, A: 85, B: 65, C: 35, Impulsivo: 10 };

export function calc(trades, initial = 10000) {
  const closed = (trades || []).filter(isClosedEvaluableTrade);
  const resultValue = t => toNumberSafe(t.resultMoney);
  const results = closed.map(resultValue);
  const rVals = closed.map(realizedRValue);
  const total = results.reduce((a, b) => a + b, 0);
  const wins = closed.filter(t => resultValue(t) > 0);
  const losses = closed.filter(t => resultValue(t) < 0);
  const winLossCount = wins.length + losses.length;
  const grossProfit = wins.reduce((sum, t) => sum + resultValue(t), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + resultValue(t), 0));
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit ? grossProfit : 0);
  const payoffRatio = avgLoss ? avgWin / avgLoss : 0;
  const expectancy = closed.length ? total / closed.length : 0;
  const validRVals = rVals.filter(x => Number.isFinite(x) && x !== 0);
  const meanR = validRVals.length ? validRVals.reduce((a, b) => a + b, 0) / validRVals.length : 0;
  const varianceR = validRVals.length ? validRVals.reduce((s, x) => s + Math.pow(x - meanR, 2), 0) / validRVals.length : 0;
  const stdR = Math.sqrt(varianceR);
  const sharpeLike = stdR ? meanR / stdR * Math.sqrt(Math.min(252, Math.max(1, closed.length))) : 0;
  let eq = initial, peak = initial, maxDD = 0, ddMoney = 0;
  const curve = [{ name: 'Inicio', equity: initial }];
  [...closed].sort((a, b) => String(tradeDayKey(a)).localeCompare(String(tradeDayKey(b))) || String(a.createdAt?.seconds || a.id || '').localeCompare(String(b.createdAt?.seconds || b.id || ''))).forEach((t, i) => { eq += resultValue(t); peak = Math.max(peak, eq); const dd = peak - eq; ddMoney = Math.max(ddMoney, dd); maxDD = Math.max(maxDD, peak ? dd / peak * 100 : 0); curve.push({ name: tradeDayKey(t) || `T${i + 1}`, equity: Math.round(eq), pnl: resultValue(t) }); });
  const dayRows = Object.values(groupTradesByDay(closed)).sort((a, b) => a.date.localeCompare(b.date));
  const bestDay = dayRows.length ? [...dayRows].sort((a, b) => b.total - a.total)[0] : null;
  const worstDay = dayRows.length ? [...dayRows].sort((a, b) => a.total - b.total)[0] : null;
  const by = k => Object.values(closed.reduce((a, t) => { const n = t[k] || 'N/A'; a[n] = a[n] || { name: n, value: 0, count: 0 }; a[n].value += resultValue(t); a[n].count++; return a; }, {}));
  const byBias = Object.values(closed.reduce((a, t) => { const n = t.bias || t.side || 'N/A'; a[n] = a[n] || { name: n, value: 0, count: 0 }; a[n].value += resultValue(t); a[n].count++; return a; }, {})).sort((a, b) => b.value - a.value);
  const bestBias = byBias[0] || { name: '—', value: 0, count: 0 };
  const avgR = validRVals.length ? validRVals.reduce((s, x) => s + x, 0) / validRVals.length : 0;
  const plan = closed.filter(tradeFollowedPlan);
  const recovery = ddMoney ? total / ddMoney : 0;
  const impulseWords = ['Operé por impulso', 'Sobreoperé', 'Me anticipé', 'Moví el stop'];
  const impulseTrades = closed.filter(t => safeArray(t.executionBehaviors).some(x => impulseWords.includes(x)) || t.quality === 'Impulsivo');
  const lateEntries = closed.filter(t => safeArray(t.executionBehaviors).includes('Entré tarde'));
  const movedSL = closed.filter(t => safeArray(t.executionBehaviors).includes('Moví el stop'));
  const planFollowed = closed.filter(tradeFollowedPlan);
  const negativeBehaviorOptions = ['Dudé antes de entrar', 'Entré tarde', 'Me anticipé', 'Moví el stop', 'Cerré antes de tiempo', 'Sobreoperé', 'Operé por impulso', 'Rompí reglas'];
  const freq = (arr) => { const items = (arr || []).filter(Boolean); if (!items.length) return null; return Object.values(items.reduce((a, x) => { a[x] = a[x] || { name: x, count: 0 }; a[x].count++; return a; }, {})).sort((a, b) => b.count - a.count)[0]?.name || null; };
  const allBehaviors = closed.flatMap(t => safeArray(t.executionBehaviors));
  const repeatedErrors = closed.flatMap(t => { const behaviors = safeArray(t.executionBehaviors); const negativeExecution = behaviors.filter(x => negativeBehaviorOptions.includes(x)); const post = negativeBehaviorOptions.includes(t.postTradeBehavior) ? [t.postTradeBehavior] : []; return [...negativeExecution, ...post]; });
  const lossEmotions = closed.filter(t => resultValue(t) < 0).map(t => t.emotionBefore).filter(Boolean);
  const goodLosses = closed.filter(t => resultValue(t) < 0 && Number(t.behaviorScore || behaviorScoreFromTrade(t)) >= 70);
  const badWins = closed.filter(t => resultValue(t) > 0 && Number(t.behaviorScore || behaviorScoreFromTrade(t)) < 70);
  const behaviorAvg = closed.length ? closed.reduce((sum, t) => sum + Number(t.behaviorScore || behaviorScoreFromTrade(t)), 0) / closed.length : 0;
  return { initial, equity: initial + total, total, profitPct: initial ? total / initial * 100 : 0, count: closed.length, wins: wins.length, losses: losses.length, breakeven: closed.length - winLossCount, winrate: winLossCount ? wins.length / winLossCount * 100 : 0, avgR, expectancy, maxDD, ddMoney, best: Math.max(0, ...results), worst: Math.min(0, ...results), bestDay, worstDay, curve, byAsset: by('asset'), bySession: by('session'), bySetup: Object.values(closed.reduce((a, t) => { const n = normalizeTradeSetup(t); a[n] = a[n] || { name: n, value: 0, count: 0 }; a[n].value += resultValue(t); a[n].count++; return a; }, {})).sort((a, b) => b.value - a.value), byBias, bestBias, byQuality: by('quality'), discipline: closed.length ? planFollowed.length / closed.length * 100 : 0, qualityAvg: closed.length ? closed.reduce((s, t) => s + (qualityScore[t.quality] || 0), 0) / closed.length : 0, planWinrate: plan.length ? plan.filter(t => resultValue(t) > 0).length / plan.length * 100 : 0, grossProfit, grossLoss, avgWin, avgLoss, profitFactor, payoffRatio, sharpeLike, recovery, meanR, stdR, behaviorAvg, planFollowedPct: closed.length ? planFollowed.length / closed.length * 100 : 0, impulseTrades: impulseTrades.length, errorMostRepeated: freq(repeatedErrors) || 'Sin error dominante', emotionBeforeLoss: freq(lossEmotions), lateEntries: lateEntries.length, movedSL: movedSL.length, goodLosses: goodLosses.length, badWins: badWins.length };
}

export function insights(s) {
  const cards = [];
  const score = s.count ? Math.round(Math.min(100, Math.max(0, (s.profitFactor >= 1 ? 25 : 8) + (s.discipline * .28) + (s.winrate * .18) + (Math.max(0, Math.min(2, s.avgR)) * 16) + (s.qualityAvg * .13)))) : 0;
  cards.push({ label: 'Score operativo', value: s.count ? `${score}/100` : 'Sin datos', tone: score >= 75 ? 'good' : score >= 55 ? 'warn' : 'neutral', text: s.count ? 'Combina disciplina, calidad, R promedio, winrate y factor de beneficio.' : 'Carga trades para activar el score.' });
  cards.push({ label: 'Factor de beneficio', value: s.count ? (s.profitFactor ? s.profitFactor.toFixed(2) : '0.00') : '—', tone: s.profitFactor >= 1.5 ? 'good' : s.profitFactor >= 1 ? 'warn' : 'bad', text: 'Mide cuánto ganas por cada $1 perdido. >1.30 empieza a ser saludable.' });
  cards.push({ label: 'Sharpe operativo', value: s.count ? s.sharpeLike.toFixed(2) : '—', tone: s.sharpeLike > 1 ? 'good' : s.sharpeLike > 0 ? 'warn' : 'bad', text: 'Relación entre retorno promedio en R y volatilidad de tus resultados.' });
  cards.push({ label: 'Expectativa', value: s.count ? formatMoneyClean(s.expectancy) : '—', tone: s.expectancy > 0 ? 'good' : s.expectancy < 0 ? 'bad' : 'neutral', text: 'Promedio real que entrega cada trade registrado.' });
  if (s.bySession.length) { const b = [...s.bySession].sort((a, b) => b.value - a.value)[0]; cards.push({ label: 'Mejor sesión', value: b.name, tone: b.value >= 0 ? 'good' : 'bad', text: `Resultado acumulado: ${formatMoneyClean(b.value)} en ${formatMetricCard(b.count)} trade(s).` }); }
  if (s.byBias?.length) { const b = s.byBias[0]; cards.push({ label: 'Sesgo más rentable', value: b.name, tone: b.value >= 0 ? 'good' : 'warn', text: `Ese sesgo generó ${formatMoneyClean(b.value)} en ${formatMetricCard(b.count)} trade(s). Úsalo para detectar dónde está tu ventaja.` }); }
  if (s.bySetup.length) { const b = s.bySetup[0]; cards.push({ label: 'Setup dominante', value: b.name, tone: b.value >= 0 ? 'good' : 'warn', text: `Resultado acumulado: ${formatMoneyClean(b.value)}. Evita dispersarte fuera de tu edge.` }); }
  cards.push({ label: 'Drawdown máximo', value: pct(s.maxDD), tone: s.maxDD <= 5 ? 'good' : s.maxDD <= 10 ? 'warn' : 'bad', text: `Caída máxima estimada: ${formatMoneyClean(s.ddMoney)} desde el pico de equity.` });
  cards.push({ label: 'Disciplina', value: pct(s.discipline), tone: s.discipline >= 80 ? 'good' : s.discipline >= 60 ? 'warn' : 'bad', text: 'Porcentaje de trades donde marcaste que seguiste el plan.' });
  return cards;
}

export function getTradesForDate(trades = [], date) { const key = normalizeDateKey(date) || String(date || today()).slice(0, 10); return (trades || []).filter(t => getTradeOperationalDateKey(t) === key); }

export function calculateDailyTradeStats(trades = []) {
  const rows = trades || [];
  const rValues = rows.map(t => Number(t.resultR || 0)).filter(Number.isFinite);
  const moneyValues = rows.map(t => Number(t.resultMoney || 0)).filter(Number.isFinite);
  const wins = rows.filter(t => Number(t.resultMoney || 0) > 0 || Number(t.resultR || 0) > 0).length;
  const losses = rows.filter(t => Number(t.resultMoney || 0) < 0 || Number(t.resultR || 0) < 0).length;
  const breakevens = Math.max(0, rows.length - wins - losses);
  const netR = rValues.reduce((a, b) => a + b, 0);
  const netPL = moneyValues.reduce((a, b) => a + b, 0);
  const riskValues = rows.map(t => Number(t.riskMoney || 0)).filter(n => Number.isFinite(n) && n > 0);
  const behaviorScores = rows.map(t => Number(t.behaviorScore || behaviorScoreFromTrade(t) || 0)).filter(n => Number.isFinite(n) && n > 0);
  const checklistScores = rows.map(t => Number(t.checklistScore || 0)).filter(n => Number.isFinite(n) && n > 0);
  const mostCommon = (values) => { const map = {}; values.filter(Boolean).forEach(v => { map[v] = (map[v] || 0) + 1; }); return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || ''; };
  return {
    totalTrades: rows.length,
    netR, netPL, wins, losses, breakevens,
    winRate: rows.length ? (wins / rows.length) * 100 : 0,
    bestR: rValues.length ? Math.max(...rValues) : 0,
    worstR: rValues.length ? Math.min(...rValues) : 0,
    avgR: rValues.length ? netR / rValues.length : 0,
    avgRisk: riskValues.length ? riskValues.reduce((a, b) => a + b, 0) / riskValues.length : 0,
    maxRisk: riskValues.length ? Math.max(...riskValues) : 0,
    behaviorScore: behaviorScores.length ? behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length : 0,
    planComplianceRate: rows.length ? (rows.filter(t => t.followedPlan === true).length / rows.length) * 100 : 0,
    checklistAverage: checklistScores.length ? checklistScores.reduce((a, b) => a + b, 0) / checklistScores.length : 0,
    topSetup: mostCommon(rows.map(t => normalizeTradeSetup(t) || t.setup || t.pattern)),
    mainSession: mostCommon(rows.map(t => t.session))
  };
}
