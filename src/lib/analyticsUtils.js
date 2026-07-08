import { getTradeOperationalDateKey, normalizeDateKey, today, daysInMonth } from './dateUtils.js';
import { toNumberSafe, safeArray, normalizeTradeSetup, tradeDayKey, isClosedEvaluableTrade, normalizedText, accountName, normalizedAccounts } from './tradeUtils.js';
import { formatMoneyClean, formatMoneyCompactCard, formatMetricCard, formatPercentCard, formatR, pct } from './formatUtils.js';

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

export const ANALYTICS_MIN_SAMPLE = 20;
export const ANALYTICS_MIN_CHART_POINTS = 2;

export function normalizeAnalyticsSession(value = '') {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('ny') || raw.includes('new york') || raw.includes('post')) return 'NY';
  if (raw.includes('lond') || raw.includes('london')) return 'Londres';
  if (raw.includes('asia')) return 'Asia';
  return 'Otro';
}

export function accountInitialForAnalytics(settings = {}, active = '__all__') {
  const accs = normalizedAccounts(settings);
  if (active === '__all__') return accs.reduce((sum, a) => sum + Number(a.capital || 0), 0) || Number(settings.initialBalance || 10000);
  return Number(accs.find(a => a.name === active)?.capital || settings.initialBalance || 10000);
}

export function filterTradesByActiveAccounts(trades = [], settings = {}) {
  const names = normalizedAccounts(settings).map(a => a.name).filter(Boolean);
  if (!names.length) return trades || [];
  const allowed = new Set(names);
  return (trades || []).filter(t => allowed.has(accountName(t)));
}

function analyticsResultValue(t) { return toNumberSafe(t.resultMoney); }

function buildGroupMetrics(trades = []) {
  const closed = trades.filter(isClosedEvaluableTrade);
  const wins = closed.filter(t => analyticsResultValue(t) > 0);
  const losses = closed.filter(t => analyticsResultValue(t) < 0);
  const winLossCount = wins.length + losses.length;
  const rVals = closed.map(realizedRValue).filter(x => Number.isFinite(x) && x !== 0);
  const grossProfit = wins.reduce((sum, t) => sum + analyticsResultValue(t), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + analyticsResultValue(t), 0));
  return {
    count: closed.length,
    value: closed.reduce((sum, t) => sum + analyticsResultValue(t), 0),
    winrate: winLossCount ? wins.length / winLossCount * 100 : 0,
    avgR: rVals.length ? rVals.reduce((a, b) => a + b, 0) / rVals.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : (grossProfit ? grossProfit : 0),
    winCount: wins.length,
    lossCount: losses.length,
    grossProfit,
    grossLoss
  };
}

export function breakdownBySetup(trades = []) {
  const closed = trades.filter(isClosedEvaluableTrade);
  const groups = closed.reduce((acc, t) => {
    const name = normalizeTradeSetup(t);
    acc[name] = acc[name] || [];
    acc[name].push(t);
    return acc;
  }, {});
  return Object.entries(groups).map(([name, rows]) => ({ name, ...buildGroupMetrics(rows) }))
    .sort((a, b) => b.value - a.value);
}

export function breakdownBySession(trades = []) {
  const sessionOrder = ['Asia', 'Londres', 'NY', 'Otro'];
  const closed = trades.filter(isClosedEvaluableTrade);
  const groups = { Asia: [], Londres: [], NY: [], Otro: [] };
  closed.forEach(t => {
    const session = normalizeAnalyticsSession(t.session);
    (groups[session] || groups.Otro).push(t);
  });
  return sessionOrder.map(name => ({ name, ...buildGroupMetrics(groups[name]) }));
}

function topFreqItems(items = [], limit = 5) {
  const map = {};
  items.filter(Boolean).forEach(v => { map[v] = (map[v] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function behaviorInsightsFromTrades(trades = []) {
  const closed = trades.filter(isClosedEvaluableTrade);
  const mistakes = closed.flatMap(t => safeArray(t.mistakes));
  const behaviors = closed.flatMap(t => safeArray(t.executionBehaviors));
  const behaviorScores = closed.map(t => Number(t.behaviorScore || behaviorScoreFromTrade(t))).filter(Number.isFinite);
  const checklistScores = closed.map(t => Number(t.checklistScore || 0)).filter(n => Number.isFinite(n) && n > 0);
  return {
    topMistakes: topFreqItems(mistakes),
    topBehaviors: topFreqItems(behaviors),
    behaviorAvg: behaviorScores.length ? behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length : 0,
    checklistAvg: checklistScores.length ? checklistScores.reduce((a, b) => a + b, 0) / checklistScores.length : 0
  };
}

export function filterAnalyticsTrades(trades = [], filters = {}) {
  const { dateFrom, dateTo, session, setup, asset } = filters;
  return (trades || []).filter(t => {
    if (!isClosedEvaluableTrade(t)) return false;
    const date = getTradeOperationalDateKey(t);
    if (dateFrom && date && date < dateFrom) return false;
    if (dateTo && date && date > dateTo) return false;
    if (session && session !== 'Todos') {
      if (normalizeAnalyticsSession(t.session) !== session) return false;
    }
    if (setup && setup !== 'Todos' && normalizeTradeSetup(t) !== setup) return false;
    if (asset && asset !== 'Todos' && String(t.asset || '').toUpperCase() !== String(asset).toUpperCase()) return false;
    return true;
  });
}

export function getAnalyticsFilterOptions(trades = []) {
  const closed = (trades || []).filter(isClosedEvaluableTrade);
  const dates = closed.map(t => getTradeOperationalDateKey(t)).filter(Boolean).sort();
  const setups = [...new Set(closed.map(t => normalizeTradeSetup(t)))].sort();
  const assets = [...new Set(closed.map(t => String(t.asset || '').toUpperCase()).filter(Boolean))].sort();
  return {
    dateMin: dates[0] || '',
    dateMax: dates[dates.length - 1] || '',
    setups: ['Todos', ...setups],
    assets: ['Todos', ...assets],
    sessions: ['Todos', 'Asia', 'Londres', 'NY', 'Otro']
  };
}

export function buildDailyPnlForChart(trades = []) {
  return Object.values(groupTradesByDay(trades.filter(isClosedEvaluableTrade)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ name: d.date.slice(5), value: Math.round(d.total), count: d.count, date: d.date }));
}

export function buildPatternBreakdown(trades = []) {
  const closed = trades.filter(isClosedEvaluableTrade);
  const groups = closed.reduce((acc, t) => {
    const name = String(t.pattern || 'Sin patrón').trim() || 'Sin patrón';
    acc[name] = acc[name] || [];
    acc[name].push(t);
    return acc;
  }, {});
  return Object.entries(groups)
    .map(([name, rows]) => ({ name, ...buildGroupMetrics(rows) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export function buildRDistributionForChart(trades = []) {
  return (trades || [])
    .filter(isClosedEvaluableTrade)
    .map((t, i) => ({
      name: `T${i + 1}`,
      r: Number(realizedRValue(t) || 0),
      money: analyticsResultValue(t)
    }));
}

export function buildExecutiveSummary(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}) {
  const count = Number(stats?.count || 0);
  if (!count) return null;
  const sessions = (sessionRows || []).filter(s => s.count > 0).sort((a, b) => b.value - a.value);
  const setups = (setupRows || []).filter(s => s.count > 0);
  const leak = stats?.errorMostRepeated && stats.errorMostRepeated !== 'Sin error dominante'
    ? stats.errorMostRepeated
    : (behaviorData?.topMistakes?.[0]?.name || null);
  return {
    bestSession: sessions[0] ? { name: sessions[0].name, value: sessions[0].value, count: sessions[0].count } : null,
    bestSetup: setups[0] ? { name: setups[0].name, value: setups[0].value, count: setups[0].count } : null,
    leak,
    sampleState: count >= ANALYTICS_MIN_SAMPLE ? 'sólida' : count >= 5 ? 'inicial' : 'en formación',
    tradeCount: count
  };
}

export function buildOperationalDiagnostics(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}) {
  const insights = [];
  const count = Number(stats?.count || 0);
  if (!count) return insights;

  const hasSolidSample = count >= ANALYTICS_MIN_SAMPLE;
  const hasMinimalSample = count >= 5;
  const minSetupSample = 3;

  if (!hasSolidSample) {
    insights.push({
      tone: 'neutral',
      label: 'Muestra',
      title: count < 5 ? 'Muestra en formación' : 'Muestra inicial',
      text: `Con ${count} trade${count === 1 ? '' : 's'} los patrones empiezan a aparecer, pero conviene ampliar la muestra antes de tomar decisiones fuertes.`
    });
  }

  const sessionsWithData = (sessionRows || []).filter(s => s.count >= 2);
  const allSessions = (sessionRows || []).filter(s => s.count > 0);
  if (allSessions.length === 1) {
    const only = allSessions[0];
    insights.push({
      tone: 'neutral',
      label: 'Sesión',
      title: 'Sin comparación entre sesiones todavía',
      text: `Tu ventaja o resultado actual aparece concentrado en ${only.name}, pero toda la muestra viene de ese horario. No tomes esto como superioridad frente a Asia o Londres hasta registrar más operaciones en otras sesiones.`
    });
  } else if (sessionsWithData.length) {
    const best = [...sessionsWithData].sort((a, b) => b.value - a.value)[0];
    if (best && best.value !== 0) {
      insights.push({
        tone: best.value > 0 ? 'positive' : 'negative',
        label: 'Sesión',
        title: `Tu ventaja actual podría estar en ${best.name}`,
        text: `En la muestra actual, ${best.name} concentra el mejor P/L acumulado (${formatMoneyClean(best.value)} en ${best.count} trade${best.count === 1 ? '' : 's'}). Podría indicar ventaja en ese horario, pero requiere confirmación con más datos.`
      });
    }
  }

  const setupsWithData = (setupRows || []).filter(s => s.count >= minSetupSample);
  if (setupsWithData.length && setupsWithData[0].value > 0) {
    const best = setupsWithData[0];
    insights.push({
      tone: 'positive',
      label: 'Setup',
      title: `Setup con mejor retorno: ${best.name}`,
      text: `Acumula ${formatMoneyClean(best.value)} con winrate ${formatPercentCard(best.winrate)} en ${best.count} trade${best.count === 1 ? '' : 's'}. Útil para priorizar repeticiones, no como regla absoluta.`
    });
  }

  const leak = stats?.errorMostRepeated;
  if (leak && leak !== 'Sin error dominante' && hasMinimalSample) {
    insights.push({
      tone: 'negative',
      label: 'Fuga',
      title: `Patrón recurrente: ${leak}`,
      text: 'Aparece con frecuencia en la muestra. Podría estar erosionando expectativa; conviene revisarlo en el journal con contexto.'
    });
  } else if (behaviorData?.topMistakes?.[0] && hasMinimalSample) {
    const m = behaviorData.topMistakes[0];
    insights.push({
      tone: 'negative',
      label: 'Fuga',
      title: `Error más marcado: ${m.name}`,
      text: `Registrado ${m.count} vez${m.count === 1 ? '' : 'es'}. Revisá si se repite en sesiones o setups específicos.`
    });
  }

  if (Number(stats?.behaviorAvg || 0) >= 70 && hasMinimalSample) {
    insights.push({
      tone: 'positive',
      label: 'Conducta',
      title: 'Conducta operativa relativamente sólida',
      text: `Score promedio de ${Math.round(stats.behaviorAvg)}/100. El proceso parece más disciplinado que impulsivo en esta muestra.`
    });
  } else if (Number(stats?.behaviorAvg || 0) < 50 && hasMinimalSample) {
    insights.push({
      tone: 'negative',
      label: 'Conducta',
      title: 'Conducta irregular en la muestra',
      text: `Score promedio de ${Math.round(stats.behaviorAvg)}/100. Podría estar afectando consistencia; revisá ejecución antes de escalar riesgo.`
    });
  }

  if (hasMinimalSample && Number(stats?.profitFactor || 0) < 1 && Number(stats?.profitFactor || 0) > 0) {
    insights.push({
      tone: 'negative',
      label: 'Edge',
      title: 'Factor de beneficio bajo 1.0',
      text: 'Las pérdidas superan ganancias en la muestra. Podría ser muestra pequeña o fuga real; ampliá datos antes de concluir.'
    });
  }

  return insights.slice(0, 4);
}

const POSITIVE_BEHAVIORS = ['Seguí el plan', 'Respeté el riesgo'];
const NEGATIVE_BEHAVIORS = ['Dudé antes de entrar', 'Entré tarde', 'Me anticipé', 'Moví el stop', 'Cerré antes de tiempo', 'Sobreoperé', 'Operé por impulso', 'Rompí reglas'];

const BEHAVIOR_CORRECTION_HINTS = {
  'Dudé antes de entrar': 'Duda previa: revisar checklist antes de entrada.',
  'Entré tarde': 'Entrada tardía: validar si el setup sigue vigente.',
  'Me anticipé': 'Anticipación: confirmar criterio antes de ejecutar.',
  'Moví el stop': 'Stop movido: revisar plan de riesgo original.',
  'Cerré antes de tiempo': 'Cierre prematuro: revisar si fue por plan o miedo.',
  'Sobreoperé': 'Sobreoperación: bajar frecuencia hasta estabilizar.',
  'Operé por impulso': 'Impulso: pausa y checklist antes de entrar.',
  'Rompí reglas': 'Regla rota: identificar cuál y en qué contexto.'
};

function sampleConfidenceLabel(count = 0) {
  if (count >= ANALYTICS_MIN_SAMPLE) return 'Interpretable';
  if (count >= 5) return 'Inicial';
  return 'Formación';
}

export function getSampleConfidenceTier(count = 0) {
  if (count >= ANALYTICS_MIN_SAMPLE) {
    return { tier: 'Muestra interpretable', short: 'Interpretable', detail: `${count} trades evaluables` };
  }
  if (count >= 5) {
    const remaining = Math.max(0, ANALYTICS_MIN_SAMPLE - count);
    return { tier: 'Muestra inicial', short: 'Inicial', detail: `${count} trades · faltan ${remaining}` };
  }
  return {
    tier: 'Muestra en formación',
    short: 'Formación',
    detail: count ? `${count} trade${count === 1 ? '' : 's'}` : 'Sin trades'
  };
}

export function formatSetupLabel(label = '') {
  const raw = String(label || '').trim();
  if (!raw) return '—';

  const lower = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  const sweepMatch = lower.match(/^sweep\s+(high|low)\s+(london|londres|lond|asia|ny|new\s*york|post)$/);
  if (sweepMatch) {
    const dir = sweepMatch[1] === 'high' ? 'High' : 'Low';
    const session = formatSetupSessionToken(sweepMatch[2]);
    return `Sweep ${dir} de ${session}`;
  }

  const sweepSessionMatch = lower.match(/^sweep\s+(london|londres|lond|asia|ny|new\s*york|post)$/);
  if (sweepSessionMatch) {
    return `Sweep de ${formatSetupSessionToken(sweepSessionMatch[1])}`;
  }

  if (lower.startsWith('sweep ')) {
    const rest = lower.slice(6).trim();
    if (rest) return `Sweep ${formatSetupSegment(rest)}`;
  }

  if (lower.includes('+')) {
    return lower.split(/\s*\+\s*/).map(part => formatSetupSegment(part.trim())).join(' + ');
  }

  if (lower.includes('/')) {
    return lower.split(/\s*\/\s*/).map(part => formatSetupSegment(part.trim())).join(' / ');
  }

  return formatSetupSegment(lower);
}

function formatSetupSessionToken(token = '') {
  const k = String(token || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (k.includes('lond') || k === 'london') return 'Londres';
  if (k === 'asia') return 'Asia';
  if (k.includes('ny') || k.includes('new york') || k === 'post') return 'NY';
  return k.charAt(0).toUpperCase() + k.slice(1);
}

function formatSetupSegment(segment = '') {
  const words = String(segment || '').split(/\s+/).filter(Boolean);
  if (!words.length) return '—';

  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const l = w.toLowerCase();
    const next = words[i + 1]?.toLowerCase();

    if (l === 'de' || l === 'y' || l === 'en' || l === 'del' || l === 'la' || l === 'el') {
      out.push(l);
      continue;
    }

    if ((l === 'london' || l === 'londres' || l === 'lond') && (i === 0 || out[out.length - 1] !== 'de')) {
      if (next === 'high' || next === 'low' || out.length === 0) {
        out.push('de');
      }
      out.push('Londres');
      continue;
    }

    if (l === 'asia' && (i === 0 || out[out.length - 1] !== 'de')) {
      if (next === 'high' || next === 'low' || out.length === 0) {
        out.push('de');
      }
      out.push('Asia');
      continue;
    }

    if (l === 'fvg') { out.push('FVG'); continue; }
    if (l === 'ob') { out.push('OB'); continue; }
    if (l === 'bos') { out.push('BOS'); continue; }
    if (l === 'choch') { out.push('CHoCH'); continue; }
    if (l === 'sweep') { out.push('sweep'); continue; }
    if (l === 'high') { out.push('High'); continue; }
    if (l === 'low') { out.push('Low'); continue; }
    if (l === 'ny') { out.push('NY'); continue; }
    if (l === 'london' || l === 'londres' || l === 'lond') { out.push('Londres'); continue; }
    if (l === 'asia') { out.push('Asia'); continue; }

    if (/[A-ZÁÉÍÓÚÑ]/.test(w.slice(1))) {
      out.push(w);
      continue;
    }

    out.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  return out.join(' ');
}

export function buildSetupSubtext(row = {}) {
  const count = Number(row.count || 0);
  const pl = formatMoneyClean(row.value);
  const r = formatR(row.avgR);
  return `${count} trade${count === 1 ? '' : 's'} · ${pl} · ${r} prom.`;
}

export function formatSetupProfitFactor(row = {}) {
  const count = Number(row.count || 0);
  const pf = Number(row.profitFactor || 0);
  const lossCount = Number(row.lossCount ?? 0);
  const grossLoss = Number(row.grossLoss || 0);

  if (count < 3) return { display: '—', subLabel: '', hint: 'PF no robusto con muestra corta' };
  if (lossCount === 0 || grossLoss === 0) {
    return {
      display: 'Sin pérdidas',
      subLabel: count < 10 ? 'muestra corta' : '',
      hint: count < 10 ? 'muestra corta' : 'Sin trades perdedores en la muestra'
    };
  }
  if (!Number.isFinite(pf) || pf <= 0) return { display: '—', subLabel: '', hint: '' };
  if (pf > 10) return { display: 'No robusto', subLabel: '', hint: 'PF elevado · podría deberse a pocas pérdidas en la muestra' };
  return { display: pf.toFixed(2), subLabel: '', hint: '' };
}

function normalizeProfitFactorScore(pf) {
  const v = Number(pf || 0);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const capped = Math.min(v, 4);
  if (capped < 1) return Math.round(capped * 30);
  if (capped < 2) return Math.round(30 + (capped - 1) * 35);
  return Math.round(65 + Math.min(capped - 2, 2) * 17.5);
}

function consistencyRScore(stdR, meanR, count) {
  if (!count) return 0;
  const std = Number(stdR || 0);
  const mean = Math.abs(Number(meanR || 0));
  if (std === 0) return mean > 0 ? 85 : count >= 5 ? 50 : 25;
  const ratio = mean / std;
  return Math.round(Math.min(100, Math.max(0, ratio * 25 + 40)));
}

function disciplineComponentScore(discipline) {
  return Math.round(Math.min(100, Math.max(0, Number(discipline || 0))));
}

function sampleSizeComponentScore(n) {
  const count = Number(n || 0);
  if (count < 5) return 15;
  if (count < 20) return 45;
  if (count < 50) return 75;
  return 100;
}

export function classifySampleConfidence(n = 0) {
  const count = Number(n || 0);
  if (count < 5) return { label: 'Muestra insuficiente', tier: 'insufficient', tone: 'warn', count };
  if (count < 20) return { label: 'Muestra inicial', tier: 'initial', tone: 'neutral', count };
  if (count < 50) return { label: 'Muestra interpretable', tier: 'interpretable', tone: 'good', count };
  return { label: 'Muestra sólida', tier: 'solid', tone: 'good', count };
}

export function classifySetupConfidence(n = 0) {
  const count = Number(n || 0);
  if (count < 3) {
    return { label: 'Muestra insuficiente', shortLabel: 'Insuficiente', tier: 'insufficient', rank: 0 };
  }
  if (count < 10) {
    return { label: 'En observación', shortLabel: 'Observación', tier: 'observation', rank: 1 };
  }
  return { label: 'Validado', shortLabel: 'Validado', tier: 'validated', rank: 2 };
}

export const SETUP_VALIDATION_TARGET = 10;

export function groupSetupsForValidation(rows = []) {
  const visible = (rows || []).filter(r => r.count > 0);
  const validated = [];
  const observation = [];
  const insufficient = [];
  visible.forEach(row => {
    const tier = classifySetupConfidence(row.count).tier;
    if (tier === 'validated') validated.push(row);
    else if (tier === 'observation') observation.push(row);
    else insufficient.push(row);
  });
  const byValue = (a, b) => b.value - a.value;
  validated.sort(byValue);
  observation.sort(byValue);
  insufficient.sort(byValue);
  return { validated, observation, insufficient };
}

export function buildValidationProgress(count = 0) {
  const n = Number(count || 0);
  const target = SETUP_VALIDATION_TARGET;
  const remaining = Math.max(0, target - n);
  return {
    current: n,
    target,
    remaining,
    pct: Math.min(100, Math.round((n / target) * 100)),
    label: `${n} de ${target} trades para validar muestra`
  };
}

export function buildSetupObservationReading(row = {}) {
  const progress = buildValidationProgress(row.count);
  if (progress.remaining <= 0) return 'Muestra alcanzada; pendiente de clasificación.';
  return `Señal útil, todavía no conclusión. Necesita ${progress.remaining} trade${progress.remaining === 1 ? '' : 's'} más para validación.`;
}

export function pickPrimaryObservationSetup(observation = []) {
  if (!observation.length) return null;
  const positive = observation.filter(r => r.value > 0);
  const pool = positive.length ? positive : observation;
  return [...pool].sort((a, b) => b.value - a.value)[0];
}

export function identifyEdgeSetup(trades = []) {
  const rows = breakdownBySetup(trades);
  const valid = rows.filter(r => r.count >= 3 && r.value > 0);
  if (!valid.length) return null;
  const best = [...valid].sort((a, b) => b.value - a.value)[0];
  const conf = classifySetupConfidence(best.count);
  const status = conf.tier === 'validated' ? 'Validado' : conf.tier === 'observation' ? 'Observación' : 'Insuficiente';
  return { name: best.name, value: best.value, count: best.count, winrate: best.winrate, confidence: conf, status };
}

export function identifyLeakSetup(trades = []) {
  const rows = breakdownBySetup(trades);
  const valid = rows.filter(r => r.count >= 2 && r.value < 0);
  if (!valid.length) return null;
  const worst = [...valid].sort((a, b) => a.value - b.value)[0];
  return { name: worst.name, value: worst.value, count: worst.count, winrate: worst.winrate };
}

export function generateMainInsightSentence(edge, leak, sessionRows = [], count = 0) {
  return generateExecutiveHeadline(edge, leak, sessionRows, count);
}

export function generateExecutiveHeadline(edge, leak, sessionRows = [], count = 0) {
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  const singleSession = sessions.length === 1 ? sessions[0].name : null;

  const edgePart = edge?.name
    ? `Edge en ${formatSetupLabel(edge.name)}`
    : 'Sin edge validado';
  const leakPart = leak?.name
    ? `Fuga en ${formatSetupLabel(leak.name)}`
    : 'Sin fuga marcada';

  const actions = [];
  if (edge?.name) actions.push('repetir edge');
  if (leak?.name) actions.push('reducir fuga');
  if (singleSession) actions.push(`ampliar muestra fuera de ${singleSession}`);
  else if (count < ANALYTICS_MIN_SAMPLE) actions.push('ampliar muestra');
  if (!actions.length) actions.push('registrar más trades');

  return `${edgePart}. ${leakPart}. Próxima semana: ${actions.join(', ')}.`;
}

export function buildSampleFootnote(count = 0) {
  const n = Number(count || 0);
  if (n < 5) return `${n} trade${n === 1 ? '' : 's'} · faltan ${5 - n} para lectura inicial`;
  if (n < ANALYTICS_MIN_SAMPLE) return `${n} trades · faltan ${ANALYTICS_MIN_SAMPLE - n} para lectura interpretable`;
  if (n < 50) return `${n} trades · muestra interpretable`;
  return `${n} trades · muestra sólida`;
}

export function buildHeroSubline(count = 0, confidence = {}) {
  const n = Number(count || 0);
  const tier = confidence?.tier || classifySampleConfidence(n).tier;
  if (n < 5) return 'Muestra en formación; cada trade suma claridad operativa.';
  if (tier === 'solid') return 'Muestra robusta; las lecturas tienen mayor confiabilidad estadística.';
  if (tier === 'interpretable') return 'Muestra interpretable; validá edge y fuga antes de escalar riesgo.';
  return 'Señal útil con muestra inicial; priorizá consistencia antes de aumentar riesgo.';
}

export function getTopBarSampleState(count = 0) {
  const c = classifySampleConfidence(count);
  const labelMap = {
    insufficient: 'Inicial',
    initial: 'Inicial',
    interpretable: 'Interpretable',
    solid: 'Robusta'
  };
  return { label: labelMap[c.tier] || 'Inicial', tier: c.tier, tone: c.tone };
}

export function formatAnalyticsAccountLabel(active = '__all__') {
  if (!active || active === '__all__') return 'Todas las cuentas';
  return active;
}

export function formatAnalyticsDateRange(dateFrom = '', dateTo = '') {
  const fmt = (d) => {
    if (!d) return '';
    const [y, m, day] = String(d).split('-');
    if (!y || !m || !day) return d;
    return `${day}/${m}/${y}`;
  };
  const from = fmt(dateFrom);
  const to = fmt(dateTo);
  if (from && to) return `${from} – ${to}`;
  if (from) return `Desde ${from}`;
  if (to) return `Hasta ${to}`;
  return '';
}

export function buildHeroChips(edge, leak) {
  return {
    edge: edge?.name ? formatSetupLabel(edge.name) : 'Sin validar',
    edgeValue: edge ? formatMoneyClean(edge.value) : '—',
    leak: leak?.name ? formatSetupLabel(leak.name) : 'Sin fuga',
    leakValue: leak ? formatMoneyClean(leak.value) : '—',
    focoRepeat: edge?.name ? 'Repetir edge' : 'Ampliar muestra',
    focoReduce: leak?.name ? 'Reducir fuga' : 'Sin fuga activa'
  };
}

export function getBehaviorReading(score = 0) {
  const s = Math.round(Number(score || 0));
  if (s >= 80) return 'Tu conducta sostiene el edge.';
  if (s >= 60) return 'Conducta aceptable, revisar fugas repetidas.';
  return 'La conducta está erosionando la ventaja.';
}

function pickWatchRisk(stats = {}, sessionRows = [], count = 0) {
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  if (sessions.length === 1) {
    const share = count ? Math.round((sessions[0].count / count) * 100) : 100;
    return {
      risk: `Concentración ${sessions[0].name}`,
      data: `${count} trades · ${share}%`,
      reading: 'Sin comparación real por sesión.',
      action: `Ampliar muestra fuera de ${sessions[0].name}.`,
      tone: 'warn'
    };
  }
  if (count < 5) {
    return {
      risk: 'Muestra baja',
      data: `${count} trades`,
      reading: 'Lectura en formación.',
      action: `${Math.max(0, 5 - count)} trades más para lectura inicial.`,
      tone: 'warn'
    };
  }
  if (count < ANALYTICS_MIN_SAMPLE) {
    return {
      risk: 'Muestra inicial',
      data: `${count} trades`,
      reading: 'Muestra todavía no interpretable.',
      action: `${ANALYTICS_MIN_SAMPLE - count} trades más para lectura interpretable.`,
      tone: 'warn'
    };
  }
  if (Number(stats?.maxDD || 0) > 10) {
    return {
      risk: `Drawdown ${pct(stats.maxDD)}`,
      data: formatMoneyClean(stats.ddMoney),
      reading: 'Drawdown elevado en la muestra.',
      action: 'No escalar riesgo hasta nueva evidencia.',
      tone: 'warn'
    };
  }
  if (Number(stats?.behaviorAvg || 0) < 50) {
    return {
      risk: 'Conducta débil',
      data: `${Math.round(stats.behaviorAvg)}/100`,
      reading: 'La ejecución erosiona el edge.',
      action: 'Revisar conducta antes de aumentar tamaño.',
      tone: 'warn'
    };
  }
  if (Number(stats?.profitFactor || 0) > 0 && Number(stats.profitFactor) < 1) {
    return {
      risk: 'PF bajo',
      data: Number(stats.profitFactor).toFixed(2),
      reading: 'Edge no confirmado en la muestra.',
      action: 'Recortar setups con PF marginal.',
      tone: 'warn'
    };
  }
  if (sessions.length <= 1) {
    return {
      risk: 'Sin comparación',
      data: '1 sesión',
      reading: 'Sin lectura comparativa por horario.',
      action: 'Ampliar horarios operativos.',
      tone: 'warn'
    };
  }
  return {
    risk: 'Sin alertas críticas',
    data: `${count} trades`,
    reading: 'Sin fricción operativa marcada.',
    action: 'Mantener disciplina de registro.',
    tone: 'neutral'
  };
}

export function buildInsightCards(trades = [], stats = {}, sessionRows = [], behaviorData = {}) {
  const count = Number(stats?.count || 0);
  const edge = identifyEdgeSetup(trades);
  const leak = identifyLeakSetup(trades);

  const repeatVerdict = edge
    ? (edge.confidence.tier === 'validated' ? 'Validado' : edge.confidence.tier === 'observation' ? 'En observación' : 'Insuficiente')
    : 'Insuficiente';

  const repeat = edge ? {
    label: 'Repetir',
    setup: formatSetupLabel(edge.name),
    pl: edge.value,
    trades: edge.count,
    wr: edge.winrate,
    status: repeatVerdict,
    tone: edge.confidence.tier === 'validated' ? 'positive' : edge.confidence.tier === 'observation' ? 'warn' : 'neutral',
    line: `${formatMoneyClean(edge.value)} · ${edge.count} trades · ${formatPercentCard(edge.winrate)} acierto`
  } : {
    label: 'Repetir',
    setup: 'Sin edge validado',
    pl: 0,
    trades: 0,
    wr: 0,
    status: 'Insuficiente',
    tone: 'neutral',
    line: count < 3 ? 'Necesitás más trades por setup' : 'Sin setup N≥3 positivo'
  };

  const cut = leak ? {
    label: 'Recortar',
    setup: formatSetupLabel(leak.name),
    pl: leak.value,
    trades: leak.count,
    reading: 'Reducir exposición',
    tone: 'negative',
    line: `${formatMoneyClean(leak.value)} · ${leak.count} trades`
  } : {
    label: 'Recortar',
    setup: 'Sin fuga marcada',
    pl: 0,
    trades: 0,
    reading: 'Sin fuga activa',
    tone: 'neutral',
    line: 'No hay setup negativo N≥2'
  };

  const watchRaw = pickWatchRisk(stats, sessionRows, count);
  const watch = {
    label: 'Investigar',
    setup: watchRaw.risk,
    line: watchRaw.data,
    reading: watchRaw.reading,
    action: watchRaw.action,
    tone: watchRaw.tone
  };

  return { repeat, cut, watch };
}

export function generateInstitutionalDiagnosis(edge, leak, sessionRows = [], count = 0) {
  const edgePart = edge?.name
    ? `Tu edge actual aparece en ${formatSetupLabel(edge.name)}`
    : 'Aún no hay edge con muestra suficiente';
  const leakPart = leak?.name
    ? `La fuga principal está en ${formatSetupLabel(leak.name)}`
    : 'Sin fuga principal activa';
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  const conf = classifySampleConfidence(count);
  const confWord = conf.tier === 'solid' ? 'sólida'
    : conf.tier === 'interpretable' ? 'interpretable'
    : conf.tier === 'initial' ? 'inicial'
    : 'en formación';
  const actions = [];
  if (edge?.name) actions.push('repetí el edge');
  if (leak?.name) actions.push('recortá la fuga');
  if (sessions.length === 1) actions.push(`ampliá muestra fuera de ${sessions[0].name}`);
  else if (count < ANALYTICS_MIN_SAMPLE) actions.push('ampliá la muestra');
  const actionPart = actions.length
    ? `La lectura todavía es ${confWord}: ${actions.join(', ')}.`
    : `La lectura es ${confWord}: seguí registrando con disciplina.`;
  return `${edgePart}. ${leakPart}. ${actionPart}`;
}

export function buildWeeklyActionLine(edge, leak, sessionRows = [], count = 0) {
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  const parts = [];
  if (edge?.name) parts.push(`repetir ${formatSetupLabel(edge.name)}`);
  if (leak?.name) parts.push(`recortar ${formatSetupLabel(leak.name)}`);
  if (sessions.length === 1) parts.push(`ampliar muestra fuera de ${sessions[0].name}`);
  else if (count < ANALYTICS_MIN_SAMPLE) parts.push('ampliar muestra');
  const action = parts.length ? parts.join(', ') : 'consolidar registro y ampliar muestra';
  return action.charAt(0).toUpperCase() + action.slice(1) + '.';
}

export function buildExecutiveCommandCopy(edge, leak, sessionRows = [], count = 0) {
  const edgeLine = edge?.name
    ? `Edge activo en ${formatSetupLabel(edge.name)}.`
    : 'Sin edge validado en la muestra.';
  const leakLine = leak?.name
    ? `Fuga principal en ${formatSetupLabel(leak.name)}.`
    : 'Sin fuga principal marcada.';
  const headline = `${edgeLine} ${leakLine}`;
  const weeklyAction = buildWeeklyActionLine(edge, leak, sessionRows, count);
  const conf = classifySampleConfidence(count);
  const subline = conf.tier === 'solid' || conf.tier === 'interpretable'
    ? `Lectura ${conf.label.toLowerCase()}: señal útil con muestra consistente.`
    : 'Lectura inicial: señal útil, todavía no conclusión.';
  return { headline, weeklyAction, subline };
}

export function buildEdgeLabPipeline(setupRows = []) {
  const { observation, insufficient } = groupSetupsForValidation(setupRows);
  const leaks = (setupRows || [])
    .filter(r => r.count >= 2 && r.value < 0)
    .sort((a, b) => a.value - b.value);
  const toItem = (row, status) => ({
    name: row.name,
    label: formatSetupLabel(row.name),
    count: row.count,
    value: row.value,
    avgR: row.avgR,
    winrate: row.winrate,
    status
  });
  return {
    observation: observation.map(r => toItem(r, 'Observación')),
    insufficient: insufficient.map(r => toItem(r, 'Insuficiente')),
    leaks: leaks.map(r => toItem(r, 'Fuga'))
  };
}

export function prioritizeInsufficientSetups(items = [], limit = 4) {
  const sorted = [...items].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return Math.abs(b.value) - Math.abs(a.value);
  });
  const visible = sorted.slice(0, limit);
  const overflow = Math.max(0, sorted.length - limit);
  return { visible, overflow };
}

export function prioritizeLeakSetups(items = [], limit = 2) {
  return [...items].sort((a, b) => a.value - b.value).slice(0, limit);
}

export function pickActiveThesis(setupRows = [], trades = []) {
  const { validated, observation } = groupSetupsForValidation(setupRows);
  if (validated.length) {
    const row = validated[0];
    return {
      row,
      tier: 'validated',
      reading: 'Setup validado en la muestra.',
      progress: buildValidationProgress(row.count)
    };
  }
  const primary = pickPrimaryObservationSetup(observation) || identifyEdgeSetup(trades);
  if (!primary) return null;
  const row = primary.count !== undefined
    ? primary
    : observation.find(r => r.name === primary.name) || observation[0];
  if (!row) return null;
  return {
    row,
    tier: 'observation',
    reading: buildSetupObservationReading(row),
    progress: buildValidationProgress(row.count)
  };
}

export function buildActionDirectives(trades = [], stats = {}, sessionRows = [], behaviorData = {}) {
  const cards = buildInsightCards(trades, stats, sessionRows, behaviorData);
  const edge = identifyEdgeSetup(trades);
  const edgeRow = edge ? breakdownBySetup(trades).find(r => r.name === edge.name) : null;
  const avgRLine = edgeRow?.avgR ? ` · ${formatR(edgeRow.avgR)} promedio` : '';

  const repeatConfidence = cards.repeat.status === 'Validado'
    ? 'Señal validada en la muestra.'
    : cards.repeat.status === 'En observación'
    ? 'Señal útil, aún no validada.'
    : 'Muestra insuficiente para conclusión.';

  return {
    repeat: {
      ...cards.repeat,
      motive: cards.repeat.setup !== 'Sin edge validado' ? 'Edge con retorno positivo' : 'Sin candidato activo',
      evidence: `${cards.repeat.line}${avgRLine}`,
      confidence: repeatConfidence
    },
    cut: {
      ...cards.cut,
      motive: cards.cut.setup !== 'Sin fuga marcada' ? 'Pérdida neta en muestra' : 'Sin fuga activa',
      evidence: cards.cut.line,
      confidence: cards.cut.setup !== 'Sin fuga marcada' ? 'Reducir exposición hasta nueva evidencia.' : 'Sin alerta de fuga.'
    },
    investigate: {
      label: 'Investigar',
      setup: cards.watch.setup,
      line: cards.watch.line,
      evidence: cards.watch.line,
      reading: cards.watch.reading,
      action: cards.watch.action,
      motive: cards.watch.action,
      confidence: cards.watch.reading,
      tone: cards.watch.tone
    }
  };
}

export function buildWeeklyPlan(trades = [], stats = {}, sessionRows = [], setupRows = []) {
  const count = Number(stats?.count || 0);
  const edge = identifyEdgeSetup(trades);
  const leak = identifyLeakSetup(trades);
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  const singleSession = sessions.length === 1;
  const hasMinimal = count >= ANALYTICS_MIN_SAMPLE;
  const title = hasMinimal
    ? 'Plan sugerido para la próxima semana'
    : 'Plan de recolección de muestra';
  const bullets = [];

  if (edge) {
    const remaining = Math.max(0, SETUP_VALIDATION_TARGET - edge.count);
    if (edge.count < SETUP_VALIDATION_TARGET) {
      bullets.push(`Repetir ${formatSetupLabel(edge.name)} hasta llegar a ${SETUP_VALIDATION_TARGET} trades${remaining ? ` (faltan ${remaining})` : ''}.`);
    } else {
      bullets.push(`Sostener ${formatSetupLabel(edge.name)} con disciplina de registro.`);
    }
  } else if (count < 3) {
    bullets.push('Registrar al menos 3 trades por setup para iniciar validación.');
  }

  if (leak) {
    bullets.push(`Reducir exposición en ${formatSetupLabel(leak.name)} hasta nueva evidencia.`);
  }

  if (singleSession) {
    bullets.push(`Registrar operaciones fuera de ${sessions[0].name} antes de comparar sesiones.`);
  } else if (!hasMinimal) {
    bullets.push(`Ampliar muestra a ${ANALYTICS_MIN_SAMPLE} trades para lectura interpretable.`);
  } else if (!edge && setupRows.length) {
    const candidate = pickPrimaryObservationSetup(groupSetupsForValidation(setupRows).observation);
    if (candidate) {
      bullets.push(`Profundizar ${formatSetupLabel(candidate.name)} para confirmar señal (${candidate.count}/${SETUP_VALIDATION_TARGET} trades).`);
    }
  }

  if (!bullets.length) {
    bullets.push('Mantener registro completo de setup, sesión y conducta en cada trade.');
  }

  return { title, bullets: bullets.slice(0, 3), hasMinimal, count };
}

export function buildKpiReadings(stats = {}) {
  const s = stats || {};
  const count = Number(s.count || 0);
  if (!count) return null;

  const pf = Number(s.profitFactor || 0);
  let pfReading = 'Sin datos';
  let pfState = 'neutral';
  if (pf >= 2) { pfReading = 'Saludable · >2.0'; pfState = 'positive'; }
  else if (pf >= 1.5) { pfReading = 'Aceptable · >1.5'; pfState = 'neutral'; }
  else if (pf >= 1) { pfReading = 'Marginal · ~1.0'; pfState = 'neutral'; }
  else if (pf > 0) { pfReading = 'Fuga activa · <1.0'; pfState = 'negative'; }

  const dd = Number(s.maxDD || 0);
  const recovery = Number(s.recovery || 0);
  const ddReading = dd <= 5 ? 'Controlado' : dd <= 10 ? 'Moderado' : 'Elevado';

  const exp = Number(s.expectancy || 0);
  const pl = Number(s.total || 0);
  const disc = Number(s.discipline || 0);

  return {
    profitFactor: { value: pf > 0 && Number.isFinite(pf) ? `PF ${pf.toFixed(2)}` : 'PF —', reading: pfReading, hint: 'Ganancia bruta ÷ pérdida bruta', state: pfState },
    netPl: { value: formatMoneyCompactCard(pl), reading: pl >= 0 ? 'Acumulado neto' : 'Pérdida neta', state: pl >= 0 ? 'positive' : 'negative' },
    expectancy: { value: formatMoneyCompactCard(exp), reading: exp > 0 ? 'Edge positivo' : exp < 0 ? 'Edge negativo' : 'En equilibrio', state: exp > 0 ? 'positive' : exp < 0 ? 'negative' : 'neutral' },
    drawdown: { value: pct(dd), reading: ddReading, state: dd > 10 ? 'negative' : 'neutral', sub: recovery > 0 ? `${recovery.toFixed(2)}× recuperación` : '—' },
    winrate: { value: formatPercentCard(s.winrate), reading: 'Evaluar junto a R', state: 'neutral' },
    discipline: { value: formatPercentCard(disc), reading: disc >= 80 ? 'Sostiene el edge' : disc >= 60 ? 'Irregular' : 'Débil', state: disc >= 70 ? 'positive' : disc >= 50 ? 'neutral' : 'negative' },
    trades: { value: String(count), reading: `${s.wins}G · ${s.losses}P`, state: 'neutral' }
  };
}

export function calculateEdgeScore(trades = [], initial = 10000) {
  const stats = calc(trades, initial);
  const count = stats.count;
  if (!count) {
    return { score: 0, stats, components: {}, confidence: classifySampleConfidence(0), edge: null, leak: null, sentence: '' };
  }
  const pfScore = normalizeProfitFactorScore(stats.profitFactor);
  const consScore = consistencyRScore(stats.stdR, stats.meanR, count);
  const discScore = disciplineComponentScore(stats.discipline);
  const sampleScore = sampleSizeComponentScore(count);
  const raw = pfScore * 0.40 + consScore * 0.25 + discScore * 0.20 + sampleScore * 0.15;
  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const confidence = classifySampleConfidence(count);
  const edge = identifyEdgeSetup(trades);
  const leak = identifyLeakSetup(trades);
  const sessionRows = breakdownBySession(trades);
  const sentence = generateExecutiveHeadline(edge, leak, sessionRows, count);
  const diagnosis = generateInstitutionalDiagnosis(edge, leak, sessionRows, count);
  const commandCopy = buildExecutiveCommandCopy(edge, leak, sessionRows, count);
  const weeklyAction = buildWeeklyActionLine(edge, leak, sessionRows, count);
  const chips = buildHeroChips(edge, leak);
  const sampleFootnote = buildSampleFootnote(count);
  const subline = buildHeroSubline(count, confidence);
  return {
    score,
    stats,
    components: { pf: pfScore, consistency: consScore, discipline: discScore, sample: sampleScore },
    confidence,
    edge,
    leak,
    sentence,
    diagnosis,
    commandCopy,
    weeklyAction,
    subline,
    chips,
    sampleFootnote
  };
}

export function sortSetupRows(rows = []) {
  return [...rows].sort((a, b) => {
    const confA = classifySetupConfidence(a.count);
    const confB = classifySetupConfidence(b.count);
    if (confB.rank !== confA.rank) return confB.rank - confA.rank;
    if (b.value !== a.value) return b.value - a.value;
    return b.count - a.count;
  });
}

/** Visual strength 0–100 for setup confidence bar (presentation only). */
export function setupStrengthPct(row = {}) {
  const count = Number(row.count || 0);
  const value = Number(row.value || 0);
  const conf = classifySetupConfidence(count);
  let pct = conf.tier === 'validated' ? 82 : conf.tier === 'observation' ? 52 : 18;
  if (value < 0) pct = Math.max(6, pct - 28);
  else if (value > 0 && count >= 3) pct = Math.min(100, pct + 8);
  return pct;
}

export function getSetupAction(row = {}) {
  const count = Number(row.count || 0);
  const value = Number(row.value || 0);
  if (!count) return { badge: 'Neutral', micro: 'sin ventaja', tone: 'neutral', lectura: 'Neutral' };
  if (value < 0) return { badge: 'Recortar', micro: 'pérdida neta', tone: 'negative', lectura: 'Recortar' };
  if (value > 0 && count >= 3) return { badge: 'Repetir', micro: 'edge mínimo', tone: 'positive', lectura: 'Repetir' };
  if (value > 0 && count < 3) return { badge: 'Observar', micro: 'falta muestra', tone: 'warn', lectura: 'Observar' };
  return { badge: 'Neutral', micro: 'sin ventaja', tone: 'neutral', lectura: 'Neutral' };
}

export function buildStreakSnapshot(trades = []) {
  const closed = [...(trades || [])].filter(isClosedEvaluableTrade).sort((a, b) => {
    const da = String(tradeDayKey(a)).localeCompare(String(tradeDayKey(b)));
    if (da !== 0) return da;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  let count = 0;
  let sign = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    const v = analyticsResultValue(closed[i]);
    const s = v > 0 ? 1 : v < 0 ? -1 : 0;
    if (s === 0) break;
    if (sign === 0) sign = s;
    if (s === sign) count += 1;
    else break;
  }
  return { count, sign, label: sign > 0 ? 'Ganadora' : sign < 0 ? 'Perdedora' : 'Sin racha' };
}

export function buildConsistencySnapshot(stats = {}, dailyPnl = []) {
  const days = dailyPnl || [];
  const positiveDays = days.filter(d => Number(d.value) > 0).length;
  const negativeDays = days.filter(d => Number(d.value) < 0).length;
  const totalDays = days.length;
  return {
    positiveDays,
    negativeDays,
    breakevenDays: Math.max(0, totalDays - positiveDays - negativeDays),
    totalDays,
    consistencyPct: totalDays ? (positiveDays / totalDays) * 100 : 0,
    stdR: Number(stats?.stdR || 0),
    meanR: Number(stats?.meanR || 0)
  };
}

export function buildOperationalPriorities(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}) {
  const count = Number(stats?.count || 0);
  const minSetup = 3;
  const hasMinimal = count >= 5;

  if (!hasMinimal) {
    return {
      repeat: { title: 'Sin candidato', meta: `${count} trades · ampliar muestra`, tone: 'neutral' },
      cut: { title: 'Sin fuga', meta: 'Muestra insuficiente', tone: 'neutral' },
      watch: { title: 'Completar muestra', meta: `Faltan ${Math.max(0, ANALYTICS_MIN_SAMPLE - count)} trades`, tone: 'warn' }
    };
  }

  let repeat = null;
  let cut = null;

  const repeatSetup = (setupRows || []).find(s => s.count >= minSetup && s.value > 0);
  if (repeatSetup) {
    repeat = {
      title: repeatSetup.name,
      meta: `${formatMoneyClean(repeatSetup.value)} · ${repeatSetup.count} trades · ${sampleConfidenceLabel(count)}`,
      tone: 'positive'
    };
  } else {
    const observeSetup = (setupRows || []).find(s => s.value > 0);
    if (observeSetup) {
      repeat = {
        title: observeSetup.name,
        meta: `${formatMoneyClean(observeSetup.value)} · ${observeSetup.count} trade${observeSetup.count === 1 ? '' : 's'} · observar`,
        tone: 'warn'
      };
    }
  }

  const cutSetup = [...(setupRows || [])].filter(s => s.count >= 2 && s.value < 0).sort((a, b) => a.value - b.value)[0];
  const leak = stats?.errorMostRepeated;
  if (cutSetup) {
    cut = {
      title: cutSetup.name,
      meta: `${formatMoneyClean(cutSetup.value)} · ${cutSetup.count} trades · revisar exposición`,
      tone: 'negative'
    };
  } else if (leak && leak !== 'Sin error dominante') {
    cut = {
      title: leak,
      meta: 'Error dominante · revisar journal',
      tone: 'negative'
    };
  } else if (behaviorData?.topMistakes?.[0]) {
    const m = behaviorData.topMistakes[0];
    cut = {
      title: m.name,
      meta: `${m.count}× en muestra · fuga conductual`,
      tone: 'negative'
    };
  }

  const sessions = (sessionRows || []).filter(s => s.count > 0);
  let watch = null;
  if (sessions.length === 1) {
    watch = {
      title: `Concentración ${sessions[0].name}`,
      meta: '100% muestra · no comparar sesiones aún',
      tone: 'warn'
    };
  } else if (Number(stats?.maxDD || 0) > 10) {
    watch = {
      title: `Drawdown ${pct(stats.maxDD)}`,
      meta: 'Vigilar riesgo antes de escalar',
      tone: 'warn'
    };
  } else if (Number(stats?.profitFactor || 0) > 0 && Number(stats.profitFactor || 0) < 1) {
    watch = {
      title: 'PF < 1',
      meta: 'Edge a confirmar con más datos',
      tone: 'warn'
    };
  } else if (count < ANALYTICS_MIN_SAMPLE) {
    watch = {
      title: 'Muestra corta',
      meta: `Faltan ${ANALYTICS_MIN_SAMPLE - count} trades para lectura sólida`,
      tone: 'warn'
    };
  }

  return {
    repeat: repeat || { title: 'Sin candidato claro', meta: 'Sin setup con edge confirmado', tone: 'neutral' },
    cut: cut || { title: 'Sin fuga dominante', meta: 'Sin setup negativo ni error marcado', tone: 'neutral' },
    watch: watch || { title: 'Sin alertas críticas', meta: 'Mantener disciplina de registro', tone: 'neutral' }
  };
}

export function buildOperationalBrief(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}) {
  const count = Number(stats?.count || 0);
  if (!count) return null;

  const minSetup = 3;
  const sessions = (sessionRows || []).filter(s => s.count > 0);
  const repeatSetup = (setupRows || []).find(s => s.count >= minSetup && s.value > 0)
    || (setupRows || []).find(s => s.value > 0);
  const bestSession = sessions.length > 1
    ? [...sessions].sort((a, b) => b.value - a.value)[0]
    : null;

  let edge = { label: 'Edge actual', name: 'Sin candidato', value: '—', meta: 'Ampliar muestra', tone: 'neutral' };
  if (repeatSetup && repeatSetup.value > 0) {
    edge = {
      label: 'Edge actual',
      name: repeatSetup.name,
      value: formatMoneyClean(repeatSetup.value),
      meta: `${repeatSetup.count} trades · ${formatPercentCard(repeatSetup.winrate)} WR`,
      tone: repeatSetup.count >= minSetup ? 'positive' : 'warn'
    };
  } else if (bestSession && bestSession.value > 0) {
    edge = {
      label: 'Edge actual',
      name: bestSession.name,
      value: formatMoneyClean(bestSession.value),
      meta: `${bestSession.count} trades · sesión líder`,
      tone: 'positive'
    };
  }

  const cutSetup = [...(setupRows || [])].filter(s => s.count >= 2 && s.value < 0).sort((a, b) => a.value - b.value)[0];
  const leak = stats?.errorMostRepeated;
  let leakBlock = { label: 'Fuga principal', name: 'Sin fuga marcada', meta: 'Sin setup negativo ni error', tone: 'neutral' };
  if (cutSetup) {
    leakBlock = {
      label: 'Fuga principal',
      name: cutSetup.name,
      value: formatMoneyClean(cutSetup.value),
      meta: `${cutSetup.count} trades · pérdida neta`,
      tone: 'negative'
    };
  } else if (leak && leak !== 'Sin error dominante') {
    leakBlock = {
      label: 'Fuga principal',
      name: leak,
      meta: 'Error dominante en muestra',
      tone: 'negative'
    };
  } else if (behaviorData?.topMistakes?.[0]) {
    const m = behaviorData.topMistakes[0];
    leakBlock = {
      label: 'Fuga principal',
      name: m.name,
      meta: `${m.count}× registrado`,
      tone: 'negative'
    };
  }

  const parts = [];
  if (repeatSetup?.name && repeatSetup.value > 0) parts.push(`Repetir ${repeatSetup.name}`);
  if (cutSetup?.name) parts.push(`Reducir ${cutSetup.name}`);
  if (sessions.length === 1) parts.push(`Ampliar muestra fuera de ${sessions[0].name}`);
  else if (count < ANALYTICS_MIN_SAMPLE) parts.push('Ampliar muestra');

  const decisionText = count < 5
    ? 'Cargar más operaciones para activar decisión operativa.'
    : parts.length
      ? `${parts.join('. ')}.`
      : 'Seguir registrando con setup, sesión y conducta.';

  const confidence = getSampleConfidenceTier(count);

  return {
    edge,
    leak: leakBlock,
    decision: { text: decisionText },
    confidence
  };
}

export function pickBehaviorFocus(behaviorData = {}, stats = {}) {
  const positives = (behaviorData?.topBehaviors || []).filter(b => POSITIVE_BEHAVIORS.includes(b.name));
  const negatives = (behaviorData?.topBehaviors || []).filter(b => NEGATIVE_BEHAVIORS.includes(b.name));
  const topMistake = behaviorData?.topMistakes?.[0] || null;
  const sustain = positives[0] ? { ...positives[0], hint: 'Sostener en la muestra actual.' } : null;
  const correctName = topMistake?.name || negatives[0]?.name || null;
  const correctCount = topMistake?.count || negatives[0]?.count || 0;
  const correct = correctName
    ? {
      name: correctName,
      count: correctCount,
      source: topMistake ? 'mistake' : 'behavior',
      hint: getBehaviorCorrectionHint(correctName)
    }
    : null;
  const dominantError = stats?.errorMostRepeated && stats.errorMostRepeated !== 'Sin error dominante'
    ? stats.errorMostRepeated
    : null;
  return { sustain, correct, dominantError };
}

export function getBehaviorCorrectionHint(name = '') {
  return BEHAVIOR_CORRECTION_HINTS[name] || 'Revisar contexto en journal.';
}

export function getSessionReading(rows = [], totalTrades = 0) {
  const visible = (rows || []).filter(s => s.count > 0);
  if (!visible.length) return null;
  if (visible.length === 1) {
    const s = visible[0];
    const share = totalTrades ? Math.round((s.count / totalTrades) * 100) : 100;
    return {
      headline: `Solo ${s.name} registrado`,
      note: 'No compares sesiones todavía. Cargá trades en Asia/Londres para lectura real.',
      expandNote: `${s.count} trade${s.count === 1 ? '' : 's'} · ${share}% de la muestra`,
      isSingleSession: true,
      compact: true
    };
  }
  const leader = [...visible].sort((a, b) => b.value - a.value)[0];
  const leaderConfident = leader.count >= 3;
  const share = totalTrades ? Math.round((leader.count / totalTrades) * 100) : 0;
  return {
    headline: leaderConfident ? `${leader.name} lidera P/L` : `${leader.name} con mejor P/L`,
    body: `${formatMoneyClean(leader.value)} · ${leader.count} trades · ${share}% muestra`,
    leaderLabel: leaderConfident ? 'Sesión líder' : 'En observación',
    isSingleSession: false,
    share,
    leaderConfident
  };
}

export function buildNextOperationalAction(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}, priorities = {}) {
  const brief = buildOperationalBrief(stats, setupRows, sessionRows, behaviorData);
  if (!brief) return { text: '', confidence: 'Formación', parts: [] };
  return { text: brief.decision.text, confidence: brief.confidence.short, parts: [] };
}

export function buildFinalSampleReading(stats = {}, setupRows = [], sessionRows = [], behaviorData = {}, priorities = {}) {
  const count = Number(stats?.count || 0);
  if (!count) return null;

  const brief = buildOperationalBrief(stats, setupRows, sessionRows, behaviorData);
  if (!brief) return null;

  const edgePart = brief.edge.name !== 'Sin candidato'
    ? `edge ${count < ANALYTICS_MIN_SAMPLE ? 'inicial' : ''} en ${brief.edge.name}`.replace('  ', ' ')
    : 'sin edge claro';
  const leakPart = brief.leak.name !== 'Sin fuga marcada'
    ? `riesgo en ${brief.leak.name}`
    : 'sin fuga dominante';

  return {
    line: `Lectura: ${edgePart}; ${leakPart}; ${brief.decision.text.replace(/\.$/, '')}.`,
    confidence: brief.confidence.short
  };
}
