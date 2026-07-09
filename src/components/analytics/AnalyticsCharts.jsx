import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { money, formatMoneyCompactCard, formatMoneyClean, formatPercentCard, formatR, formatCompactNumber } from '../../lib/formatUtils.js';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';
import { Card } from '../ui/Card.jsx';
import { DashboardChartFallback, MtcLightweightLineChart } from '../dashboard/MtcLightweightLineChart.jsx';
import { AnalyticsSectionEmpty } from './AnalyticsEmptyState.jsx';

const CHART_GRID = 'rgba(124,92,255,.08)';

const AURORA_CHART = {
  cyan: '#33E6C4',
  violet: '#7C5CFF',
  violetDeep: '#5B3FD1',
  magenta: '#FF4FA3',
  magentaDeep: '#C23B7A',
  dim: '#9C97B8'
};

const CHART_AXIS = { fill: AURORA_CHART.dim, fontSize: 12, fontWeight: 600 };
const CHART_H_PRIMARY = 220;
const CHART_H_SECONDARY = 180;

const EQUITY_PALETTE = {
  positive: AURORA_CHART.cyan,
  negative: AURORA_CHART.magenta,
  areaPositive: 'rgba(51,230,196,0.14)',
  areaNegative: 'rgba(255,79,163,0.12)',
  axis: AURORA_CHART.dim
};

function RoundedDailyBar(props) {
  const { x, y, width, height, payload, fill } = props;
  if (!width || !height) return null;
  const isPos = Number(payload?.value || 0) >= 0;
  const r = Math.min(6, Math.abs(width) / 2, Math.abs(height) / 2);
  if (isPos) {
    const path = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
    return <path d={path} fill={fill} fillOpacity={0.82} />;
  }
  const path = `M${x},${y} L${x + width},${y} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x + r},${y + height} Q${x},${y + height} ${x},${y + height - r} Z`;
  return <path d={path} fill={fill} fillOpacity={0.82} />;
}

function RoundedRBar(props) {
  const { x, y, width, height, payload, fill } = props;
  if (!width || !height) return null;
  const isPos = Number(payload?.r || 0) >= 0;
  const r = Math.min(5, Math.abs(width) / 2, Math.abs(height) / 2);
  if (isPos) {
    const path = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
    return <path d={path} fill={fill} fillOpacity={0.82} />;
  }
  const path = `M${x},${y} L${x + width},${y} L${x + width},${y + height - r} Q${x + width},${y + height} ${x + width - r},${y + height} L${x + r},${y + height} Q${x},${y + height} ${x},${y + height - r} Z`;
  return <path d={path} fill={fill} fillOpacity={0.82} />;
}

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
            <div className="analyticsChartCardBody fill analyticsChartFrame" style={{ height: CHART_H_PRIMARY }}>
              <MtcLightweightLineChart data={lwCurve} mode="equity" height={CHART_H_PRIMARY} currency={money} palette={EQUITY_PALETTE} />
            </div>
          ) : (
            <div className="analyticsChartCardFallback">
              <span>Sin curva suficiente. Registrá más trades cerrados.</span>
            </div>
          )}
        </Card>

        <Card title="P/L jornada" sub={`${dailyPnl.length} día${dailyPnl.length === 1 ? '' : 's'}`} className="analyticsChartCard primary">
          {hasDailyChart ? (
            <div className="analyticsChartCardBody fill analyticsChartFrame" style={{ height: CHART_H_PRIMARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="auditDailyPosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.cyan} />
                      <stop offset="100%" stopColor={AURORA_CHART.violetDeep} />
                    </linearGradient>
                    <linearGradient id="auditDailyNegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.magenta} />
                      <stop offset="100%" stopColor={AURORA_CHART.magentaDeep} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={6} />
                  <YAxis
                    tick={CHART_AXIS}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    domain={dailyDomain}
                    tickCount={5}
                    tickFormatter={formatAxisMoney}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.28)" strokeWidth={1.5} />
                  <Tooltip content={<ChartTooltipPremium mode="daily" />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="value" shape={<RoundedDailyBar />} maxBarSize={32}>
                    {dailyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? 'url(#auditDailyPosGrad)' : 'url(#auditDailyNegGrad)'} />
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
            <div className="analyticsChartCardBody fill compact analyticsChartFrame rDist" style={{ height: CHART_H_SECONDARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rDistribution} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap="12%">
                  <defs>
                    <linearGradient id="auditRPosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.cyan} />
                      <stop offset="100%" stopColor={AURORA_CHART.violet} />
                    </linearGradient>
                    <linearGradient id="auditRNegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.magenta} />
                      <stop offset="100%" stopColor={AURORA_CHART.magentaDeep} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis
                    tick={CHART_AXIS}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    domain={rDomain}
                    tickCount={5}
                    tickFormatter={formatAxisR}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.32)" strokeWidth={1.5} />
                  <ReferenceLine y={avgR} stroke="rgba(124,92,255,.65)" strokeDasharray="5 4" strokeWidth={1.5} />
                  <Tooltip content={<ChartTooltipPremium mode="r" />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="r" shape={<RoundedRBar />} maxBarSize={22}>
                    {rDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.r >= 0 ? 'url(#auditRPosGrad)' : 'url(#auditRNegGrad)'} />
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
