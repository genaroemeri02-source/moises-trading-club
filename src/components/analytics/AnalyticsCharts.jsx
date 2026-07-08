import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { money, formatMoneyCompactCard, formatMoneyClean, formatPercentCard, formatR, formatCompactNumber } from '../../lib/formatUtils.js';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';
import { Card } from '../ui/Card.jsx';
import { DashboardChartFallback, MtcLightweightLineChart } from '../dashboard/MtcLightweightLineChart.jsx';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

const CHART_AXIS = { fill: '#c5cedb', fontSize: 10 };
const CHART_GRID = 'rgba(255,255,255,.06)';
const CHART_H_PRIMARY = 220;
const CHART_H_SECONDARY = 180;

function formatAxisMoney(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${formatCompactNumber(abs / 1000, 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function formatAxisR(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '0R';
  const rounded = Math.abs(n) >= 10 ? Math.round(n) : Number(n.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded}R`;
}

function chartMoneyDomain(data = []) {
  const vals = data.map(d => Number(d.value || 0)).filter(Number.isFinite);
  if (!vals.length) return [-200, 200];
  const max = Math.max(...vals.map(Math.abs), 50);
  const step = max <= 200 ? 50 : max <= 500 ? 100 : max <= 1000 ? 200 : Math.ceil(max / 4 / 100) * 100;
  const limit = Math.ceil(max / step) * step || step;
  return [-limit, limit];
}

function chartRDomain(data = []) {
  const vals = data.map(d => Number(d.r || 0)).filter(Number.isFinite);
  if (!vals.length) return [-2, 2];
  const max = Math.max(...vals.map(Math.abs), 1);
  const limit = Math.max(2, Math.ceil(max));
  return [-limit, limit];
}

function ChartTooltipPremium({ active, payload, label, mode = 'default' }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(Boolean);
  const point = rows[0]?.payload || {};
  return (
    <div className="chartTooltipPremium analyticsChartTooltip">
      <span>{label || point.date || 'Dato'}</span>
      {rows.map((r, i) => {
        const v = Number(r.value ?? r.payload?.[r.dataKey] ?? 0);
        const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
        const key = String(r.dataKey || '').toLowerCase();
        let formatted = money(v);
        let name = r.name || 'Valor';
        if (key === 'r') {
          formatted = `${v.toFixed(2)}R`;
          name = 'R';
        } else if (key === 'value' && mode === 'daily') {
          formatted = formatMoneyClean(v);
          name = 'P/L';
          if (point.count) name += ` · ${point.count}t`;
        } else if (key === 'value' && mode === 'pattern') {
          formatted = formatMoneyClean(v);
          name = 'P/L';
        }
        return <b key={i} className={cls}>{name}: {formatted}</b>;
      })}
    </div>
  );
}

function PatternDominantPanel({ pattern }) {
  if (!pattern) return null;
  const label = formatSetupLabel(pattern.name);
  const plTone = pattern.value > 0 ? 'pos' : pattern.value < 0 ? 'neg' : 'neutral';
  return (
    <div className="analyticsPatternDominant">
      <span className="analyticsPatternDominantLabel">Patrón dominante</span>
      <b className="analyticsPatternDominantName" title={pattern.name}>{label}</b>
      <div className="analyticsPatternDominantStats">
        <span className={`analyticsPatternDominantPl ${plTone}`}>{formatMoneyClean(pattern.value)}</span>
        <span>{pattern.count} trade{pattern.count === 1 ? '' : 's'}</span>
        <span>{formatPercentCard(pattern.winrate)}</span>
        <span>{formatR(pattern.avgR)} prom.</span>
      </div>
    </div>
  );
}

function PatternListCompact({ patterns = [] }) {
  return (
    <div className="analyticsPatternList">
      {patterns.map(row => (
        <div key={row.name} className="analyticsPatternListRow">
          <span className="analyticsPatternListName" title={row.name}>{formatSetupLabel(row.name)}</span>
          <span className={`analyticsPatternListPl ${row.value >= 0 ? 'pos' : 'neg'}`}>{formatMoneyClean(row.value)}</span>
          <span>{row.count}T</span>
          <span>{formatPercentCard(row.winrate)}</span>
        </div>
      ))}
    </div>
  );
}

function PatternCompactCard({ pattern, horizontal = false }) {
  if (!pattern) return null;
  const label = formatSetupLabel(pattern.name);
  if (horizontal) {
    return (
      <div className="analyticsPatternCompact horizontal">
        <b title={pattern.name}>{label}</b>
        <strong className={pattern.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(pattern.value)}</strong>
        <span>{pattern.count} trade{pattern.count === 1 ? '' : 's'}</span>
        <span>{formatPercentCard(pattern.winrate)}</span>
        <span>{formatR(pattern.avgR)} prom.</span>
      </div>
    );
  }
  return (
    <div className="analyticsPatternCompact">
      <b title={pattern.name}>{label}</b>
      <div className="analyticsPatternCompactMeta">
        <strong className={pattern.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(pattern.value)}</strong>
        <span>{pattern.count} trade{pattern.count === 1 ? '' : 's'}</span>
        <span>{formatPercentCard(pattern.winrate)}</span>
        <span>{formatR(pattern.avgR)} prom.</span>
      </div>
    </div>
  );
}

export function AnalyticsCharts({ stats, dailyPnl = [], patternRows = [], rDistribution = [], hasSample }) {
  const equityCurve = (stats?.curve || []).map(p => ({
    name: p.name,
    equity: p.equity,
    time: p.name === 'Inicio' ? null : p.name,
    value: p.equity
  }));
  const lwCurve = equityCurve.filter(p => p.time).map(p => ({ time: p.time, value: p.equity }));
  const hasEquityChart = lwCurve.length >= 2;
  const hasDailyChart = dailyPnl.length >= 1;
  const hasMultiPattern = patternRows.length >= 2;
  const singlePattern = patternRows.length === 1 ? patternRows[0] : null;
  const hasRChart = rDistribution.length >= 2;
  const avgR = hasRChart
    ? rDistribution.reduce((sum, d) => sum + Number(d.r || 0), 0) / rDistribution.length
    : 0;
  const dailyDomain = chartMoneyDomain(dailyPnl);
  const rDomain = chartRDomain(rDistribution);
  const lastEquity = equityCurve[equityCurve.length - 1]?.equity || stats?.equity || 0;

  if (!hasSample) return null;

  return (
    <section className="analyticsAuditSection">
      <div className="analyticsAuditHead">
        <h3>Detalle de auditoría</h3>
        <span>Equity · jornadas · R · patrones</span>
      </div>
      <div className="analyticsAuditGrid">
        <Card
          title="Equity"
          sub={hasEquityChart ? `${money(lastEquity)} · DD ${formatMoneyCompactCard(-Math.abs(stats?.ddMoney || 0))}` : 'En formación'}
          className="analyticsChartCard primary"
        >
          {hasEquityChart ? (
            <div className="analyticsChartCardBody fill" style={{ height: CHART_H_PRIMARY }}>
              <MtcLightweightLineChart data={lwCurve} mode="equity" height={CHART_H_PRIMARY} currency={money} />
            </div>
          ) : (
            <div className="analyticsChartCardFallback">
              <span>Sin curva suficiente. Registrá más trades cerrados.</span>
            </div>
          )}
        </Card>

        <Card title="P/L jornada" sub={`${dailyPnl.length} día${dailyPnl.length === 1 ? '' : 's'}`} className="analyticsChartCard primary">
          {hasDailyChart ? (
            <div className="analyticsChartCardBody fill" style={{ height: CHART_H_PRIMARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={CHART_AXIS}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    domain={dailyDomain}
                    tickCount={5}
                    tickFormatter={formatAxisMoney}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.22)" strokeWidth={1} />
                  <Tooltip content={<ChartTooltipPremium mode="daily" />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {dailyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.82} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="analyticsChartCardFallback">
              <span>Sin jornadas operativas en la muestra.</span>
            </div>
          )}
        </Card>

        <Card
          title="Distribución R"
          sub={hasRChart ? `${rDistribution.length} trades · prom. ${formatR(avgR)}` : 'Muestra corta'}
          className="analyticsChartCard secondary"
        >
          {hasRChart ? (
            <div className="analyticsChartCardBody fill compact" style={{ height: CHART_H_SECONDARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rDistribution} margin={{ top: 2, right: 4, left: 0, bottom: 0 }} barCategoryGap="8%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis
                    tick={CHART_AXIS}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    domain={rDomain}
                    tickCount={4}
                    tickFormatter={formatAxisR}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.28)" strokeWidth={1} />
                  <ReferenceLine y={avgR} stroke="rgba(96,165,250,.55)" strokeDasharray="4 4" strokeWidth={1} />
                  <Tooltip content={<ChartTooltipPremium mode="r" />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                  <Bar dataKey="r" radius={[3, 3, 0, 0]} maxBarSize={16}>
                    {rDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.r >= 0 ? '#3b82f6' : '#ef4444'} fillOpacity={0.82} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : rDistribution.length === 1 ? (
            <div className="analyticsPatternCompact inline">
              <b>{formatR(rDistribution[0].r)}</b>
              <span>1 trade con R</span>
            </div>
          ) : (
            <div className="analyticsChartCardFallback">
              <span>Sin trades con R en la muestra.</span>
            </div>
          )}
        </Card>

        <Card
          title="Patrones"
          sub={hasMultiPattern ? `${patternRows.length} patrones` : singlePattern ? '1 patrón' : 'Sin recurrencia'}
          className={`analyticsChartCard secondary ${singlePattern ? 'patternDominant' : hasMultiPattern ? 'patternList' : 'patternEmpty'}`}
        >
          {singlePattern ? (
            <PatternDominantPanel pattern={singlePattern} />
          ) : hasMultiPattern ? (
            <PatternListCompact patterns={patternRows} />
          ) : (
            <div className="analyticsPatternCompact empty">
              <span>Aún no hay patrones suficientes para auditar recurrencia.</span>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
