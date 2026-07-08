import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { money, formatMoneyCompactCard, formatMoneyClean, formatPercentCard, formatR, formatCompactNumber } from '../../lib/formatUtils.js';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';
import { MtcLightweightLineChart } from '../dashboard/MtcLightweightLineChart.jsx';

const CHART_AXIS = { fill: '#c5cedb', fontSize: 10 };
const CHART_GRID = 'rgba(255,255,255,.06)';
const CHART_H_PRIMARY = 300;
const CHART_H_SECONDARY = 220;

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
    <div className="analyticsPerformanceEvidencePattern">
      <span>Patrón dominante</span>
      <b title={pattern.name}>{label}</b>
      <div>
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

function EvidencePanel({ title, sub, children, size = 'large', className = '' }) {
  return (
    <article className={`analyticsPerformanceEvidencePanel size-${size} ${className}`.trim()}>
      <header>
        <h4>{title}</h4>
        {sub && <span>{sub}</span>}
      </header>
      <div className="analyticsPerformanceEvidencePanelBody">{children}</div>
    </article>
  );
}

function EvidenceFallback({ text }) {
  return <p className="analyticsPerformanceEvidenceFallback">{text}</p>;
}

export function PerformanceEvidence({ stats, dailyPnl = [], patternRows = [], rDistribution = [], hasSample }) {
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
    <section className="analyticsPerformanceEvidence">
      <header className="analyticsPerformanceEvidenceHead">
        <h3>Evidencia de rendimiento</h3>
        <p>Curva, jornadas, distribución en R y patrones dominantes.</p>
      </header>

      <div className="analyticsPerformanceEvidenceGrid">
        <EvidencePanel
          title="Equity"
          sub={hasEquityChart ? `${money(lastEquity)} · DD ${formatMoneyCompactCard(-Math.abs(stats?.ddMoney || 0))}` : 'En formación'}
          size="large"
          className="equity"
        >
          {hasEquityChart ? (
            <div className="analyticsPerformanceEvidenceChart equity" style={{ height: CHART_H_PRIMARY }}>
              <MtcLightweightLineChart data={lwCurve} mode="equity" height={CHART_H_PRIMARY} currency={money} />
            </div>
          ) : (
            <EvidenceFallback text="Sin curva suficiente. Registrá más trades cerrados." />
          )}
        </EvidencePanel>

        <EvidencePanel
          title="P/L por jornada"
          sub={`${dailyPnl.length} día${dailyPnl.length === 1 ? '' : 's'}`}
          size="large"
          className="daily"
        >
          {hasDailyChart ? (
            <div className="analyticsPerformanceEvidenceChart daily" style={{ height: CHART_H_PRIMARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnl} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} width={48} domain={dailyDomain} tickCount={5} tickFormatter={formatAxisMoney} />
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
            <EvidenceFallback text="Sin jornadas operativas en la muestra." />
          )}
        </EvidencePanel>

        <EvidencePanel
          title="Distribución R"
          sub={hasRChart ? `${rDistribution.length} trades · prom. ${formatR(avgR)}` : 'Muestra corta'}
          size="compact"
          className="rDist"
        >
          {hasRChart ? (
            <div className="analyticsPerformanceEvidenceChart compact" style={{ height: CHART_H_SECONDARY }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rDistribution} margin={{ top: 2, right: 4, left: 0, bottom: 0 }} barCategoryGap="8%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} width={44} domain={rDomain} tickCount={4} tickFormatter={formatAxisR} />
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
          sub={hasMultiPattern ? `${patternRows.length} patrones` : singlePattern ? '1 patrón' : 'Sin recurrencia'}
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
