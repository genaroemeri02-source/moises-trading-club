import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { money, formatMoneyCompactCard, formatMoneyClean, formatPercentCard, formatR, formatCompactNumber } from '../../lib/formatUtils.js';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';
import { MtcLightweightLineChart } from '../dashboard/MtcLightweightLineChart.jsx';
import { useAnalyticsViewport } from './useAnalyticsViewport.js';

const CHART_GRID = 'rgba(255,255,255,.05)';

const AURORA_CHART = {
  cyan: '#33E6C4',
  violet: '#7C5CFF',
  violetDeep: '#5B3FD1',
  magenta: '#FF4FA3',
  magentaDeep: '#C23B7A',
  dim: '#9C97B8',
  axis: '#9C97B8'
};

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
    <div className="chartTooltipPremium analyticsPerformanceEvidenceTooltip">
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
    <div className="analyticsPerformanceEvidencePattern dominant">
      <header className="analyticsPerformanceEvidencePatternHead">
        <span>Patrón dominante</span>
        <em>Recurrencia</em>
      </header>
      <b className="analyticsPerformanceEvidencePatternName" title={pattern.name}>{label}</b>
      <div className="analyticsPerformanceEvidencePatternStats">
        <strong className={plTone}>{formatMoneyClean(pattern.value)}</strong>
        <em>{pattern.count} trade{pattern.count === 1 ? '' : 's'}</em>
        <em>{formatPercentCard(pattern.winrate)}</em>
        <em>{formatR(pattern.avgR)} prom.</em>
      </div>
    </div>
  );
}

function PatternListCompact({ patterns = [] }) {
  return (
    <div className="analyticsPerformanceEvidencePatternList">
      {patterns.map(row => (
        <div key={row.name} className="analyticsPerformanceEvidencePatternRow">
          <span title={row.name}>{formatSetupLabel(row.name)}</span>
          <b className={row.value >= 0 ? 'pos' : 'neg'}>{formatMoneyClean(row.value)}</b>
          <small>{row.count}T · {formatPercentCard(row.winrate)}</small>
        </div>
      ))}
    </div>
  );
}

function EvidencePanel({ title, sub, narrative, children, size = 'large', className = '' }) {
  return (
    <article className={`analyticsPerformanceEvidencePanel analyticsSurfaceSupport size-${size} ${className} ${className === 'equity' ? 'analyticsSurfaceFlagship' : ''}`.trim()}>
      <header className="analyticsPerformanceEvidencePanelHead">
        <div>
          <h4>{title}</h4>
          {narrative && <p className="analyticsPerformanceEvidencePanelNarrative">{narrative}</p>}
          {sub && <span>{sub}</span>}
        </div>
      </header>
      <div className="analyticsPerformanceEvidencePanelBody">{children}</div>
    </article>
  );
}

function EvidenceFallback({ text }) {
  return <p className="analyticsPerformanceEvidenceFallback">{text}</p>;
}

export function PerformanceEvidence({ stats, dailyPnl = [], patternRows = [], rDistribution = [], hasSample }) {
  const { mobile, narrow } = useAnalyticsViewport();
  const chartAxis = { fill: AURORA_CHART.dim, fontSize: mobile ? 12 : 12, fontWeight: 600 };
  const chartHPrimary = mobile ? 236 : narrow ? 272 : 304;
  const chartHSecondary = mobile ? 204 : narrow ? 216 : 228;
  const yAxisWidth = mobile ? 56 : narrow ? 52 : 48;
  const rAxisWidth = mobile ? 52 : 46;
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
  const startEquity = equityCurve.find(p => p.time)?.equity ?? stats?.initial ?? lastEquity;
  const equityTrend = lastEquity >= startEquity ? 'Curva ascendente' : 'Curva descendente';
  const equityNarrative = hasEquityChart
    ? `${equityTrend} · DD ${formatMoneyCompactCard(-Math.abs(stats?.ddMoney || 0))}`
    : 'En formación';
  const positiveDays = hasDailyChart ? dailyPnl.filter(d => Number(d.value || 0) > 0).length : 0;
  const bestDay = hasDailyChart
    ? dailyPnl.reduce((best, d) => (!best || Number(d.value) > Number(best.value)) ? d : best, null)
    : null;
  const dailyNarrative = hasDailyChart
    ? `${positiveDays} de ${dailyPnl.length} jornada${dailyPnl.length === 1 ? '' : 's'} positiva${positiveDays === 1 ? '' : 's'}${bestDay && bestDay.value > 0 ? ` · mejor ${formatMoneyClean(bestDay.value)}` : ''}`
    : 'Sin jornadas';
  const maxR = hasRChart
    ? Math.max(...rDistribution.map(d => Number(d.r || 0)))
    : rDistribution[0]?.r || 0;
  const rNarrative = hasRChart
    ? `Promedio ${formatR(avgR)} · mayor trade ${formatR(maxR)}`
    : rDistribution.length === 1
    ? `1 trade · ${formatR(rDistribution[0].r)}`
    : 'Muestra corta';
  const topPattern = singlePattern || (hasMultiPattern ? patternRows[0] : null);
  const patternNarrative = topPattern
    ? `${formatSetupLabel(topPattern.name)} · ${formatMoneyClean(topPattern.value)}`
    : 'Sin recurrencia clara';

  if (!hasSample) return null;

  return (
    <section className="analyticsPerformanceEvidence analyticsTier4 analyticsPerformanceEvidenceNarrative">
      <header className="analyticsPerformanceEvidenceHead">
        <h3>Evidencia de rendimiento</h3>
        <p>Respaldá el diagnóstico con curva, jornadas, R y patrones.</p>
      </header>

      <div className="analyticsPerformanceEvidenceGrid">
        <EvidencePanel
          title="Equity"
          narrative={equityNarrative}
          sub={hasEquityChart ? money(lastEquity) : null}
          size="large"
          className="equity"
        >
          {hasEquityChart ? (
            <div className="analyticsPerformanceEvidenceChart equity analyticsChartFrame" style={{ height: chartHPrimary }}>
              <MtcLightweightLineChart
                data={lwCurve}
                mode="equity"
                height={chartHPrimary}
                compact={narrow}
                mobileOptimized={mobile}
                currency={money}
                palette={EQUITY_PALETTE}
              />
            </div>
          ) : (
            <EvidenceFallback text="Sin curva suficiente. Registrá más trades cerrados." />
          )}
        </EvidencePanel>

        <EvidencePanel
          title="P/L por jornada"
          narrative={dailyNarrative}
          sub={hasDailyChart ? formatMoneyClean(dailyPnl.reduce((s, d) => s + Number(d.value || 0), 0)) : null}
          size="large"
          className="daily"
        >
          {hasDailyChart ? (
            <div className="analyticsPerformanceEvidenceChart daily analyticsChartFrame" style={{ height: chartHPrimary }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl} margin={{ top: 8, right: 8, left: 0, bottom: mobile ? 2 : 0 }} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="dailyPosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.cyan} />
                      <stop offset="100%" stopColor={AURORA_CHART.violetDeep} />
                    </linearGradient>
                    <linearGradient id="dailyNegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.magenta} />
                      <stop offset="100%" stopColor={AURORA_CHART.magentaDeep} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={chartAxis}
                    axisLine={false}
                    tickLine={false}
                    interval={mobile ? 'preserveStartEnd' : 0}
                    tickMargin={6}
                  />
                  <YAxis
                    tick={chartAxis}
                    axisLine={false}
                    tickLine={false}
                    width={yAxisWidth}
                    domain={dailyDomain}
                    tickCount={mobile ? 4 : 5}
                    tickFormatter={formatAxisMoney}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.28)" strokeWidth={1.5} />
                  <Tooltip content={<ChartTooltipPremium mode="daily" />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="value" shape={<RoundedDailyBar />} maxBarSize={mobile ? 26 : 34}>
                    {dailyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? 'url(#dailyPosGrad)' : 'url(#dailyNegGrad)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EvidenceFallback text="Sin jornadas operativas en la muestra." />
          )}
        </EvidencePanel>

        <EvidencePanel
          title="Distribución R"
          narrative={rNarrative}
          size="compact"
          className="rDist"
        >
          {hasRChart ? (
            <div className="analyticsPerformanceEvidenceChart compact analyticsChartFrame rDist" style={{ height: chartHSecondary }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rDistribution} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap="12%">
                  <defs>
                    <linearGradient id="rPosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.cyan} />
                      <stop offset="100%" stopColor={AURORA_CHART.violet} />
                    </linearGradient>
                    <linearGradient id="rNegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AURORA_CHART.magenta} />
                      <stop offset="100%" stopColor={AURORA_CHART.magentaDeep} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis
                    tick={chartAxis}
                    axisLine={false}
                    tickLine={false}
                    width={rAxisWidth}
                    domain={rDomain}
                    tickCount={mobile ? 4 : 5}
                    tickFormatter={formatAxisR}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,.32)" strokeWidth={1.5} />
                  <ReferenceLine y={avgR} stroke="rgba(124,92,255,.65)" strokeDasharray="5 4" strokeWidth={1.5} label={mobile ? undefined : { value: `Ø ${formatR(avgR)}`, position: 'right', fill: AURORA_CHART.violet, fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipPremium mode="r" />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="r" shape={<RoundedRBar />} maxBarSize={mobile ? 18 : 22}>
                    {rDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.r >= 0 ? 'url(#rPosGrad)' : 'url(#rNegGrad)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : rDistribution.length === 1 ? (
            <div className="analyticsPerformanceEvidenceSingleR">
              <b>{formatR(rDistribution[0].r)}</b>
              <span>1 trade con R</span>
            </div>
          ) : (
            <EvidenceFallback text="Sin trades con R en la muestra." />
          )}
        </EvidencePanel>

        <EvidencePanel
          title="Patrones"
          narrative={patternNarrative}
          sub={hasMultiPattern ? `${patternRows.length} patrones` : singlePattern ? 'Dominante' : null}
          size="compact"
          className="pattern"
        >
          {singlePattern ? (
            <PatternDominantPanel pattern={singlePattern} />
          ) : hasMultiPattern ? (
            <PatternListCompact patterns={patternRows} />
          ) : (
            <EvidenceFallback text="Aún no hay patrones suficientes para auditar recurrencia." />
          )}
        </EvidencePanel>
      </div>
    </section>
  );
}
