import { useMemo } from 'react';
import {
  calc,
  breakdownBySetup,
  breakdownBySession,
  behaviorInsightsFromTrades,
  buildDailyPnlForChart,
  buildPatternBreakdown,
  buildRDistributionForChart,
  accountInitialForAnalytics,
  calculateEdgeScore,
  buildActionDirectives,
  buildKpiReadings,
  buildWeeklyPlan,
  pickActiveThesis,
  buildInsightStack
} from '../../lib/analyticsUtils.js';
import { useAnalyticsFilters } from './useAnalyticsFilters.js';
import { AnalyticsHeader } from './AnalyticsHeader.jsx';
import { AnalyticsFilters } from './AnalyticsFilters.jsx';
import { AnalyticsCommandCenter } from './AnalyticsCommandCenter.jsx';
import { AnalyticsActionDirectives } from './AnalyticsActionDirectives.jsx';
import { AnalyticsKpiStrip } from './AnalyticsKpiStrip.jsx';
import { EdgeLab } from './EdgeLab.jsx';
import { OperatingProfile } from './OperatingProfile.jsx';
import { PerformanceEvidence } from './PerformanceEvidence.jsx';
import { AnalyticsWeeklyPlan } from './AnalyticsWeeklyPlan.jsx';
import { AnalyticsEmptyState } from './AnalyticsEmptyState.jsx';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

const INSIGHT_ICONS = {
  edge: TrendingUp,
  leak: TrendingDown,
  confidence: Shield
};

function AnalyticsInsightStack({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <section className="analyticsInsightStack analyticsInsightStackLinked analyticsSurfaceSupport">
      <header className="analyticsInsightStackHead">
        <h4>Lectura inteligente</h4>
        <span>Briefing del mapa</span>
      </header>
      <ul className="analyticsInsightStackList">
        {insights.map((item) => {
          const Icon = INSIGHT_ICONS[item.id] || Shield;
          return (
            <li key={item.id} className={`analyticsInsightNote tone-${item.tone}`}>
              <span className="analyticsInsightNoteIcon" aria-hidden="true">
                <Icon size={11} strokeWidth={2.25} />
              </span>
              <div className="analyticsInsightNoteBody">
                <span className="analyticsInsightNoteLabel">{item.label}</span>
                <b className="analyticsInsightNotePrimary">{item.primary}</b>
                <small className="analyticsInsightNoteSecondary">{item.secondary}</small>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AnalyticsPage({ data }) {
  const filters = useAnalyticsFilters(data.trades, data.settings);
  const initial = useMemo(
    () => accountInitialForAnalytics(data.settings, filters.activeAccount),
    [data.settings, filters.activeAccount]
  );
  const stats = useMemo(() => calc(filters.filtered, initial), [filters.filtered, initial]);
  const setupRows = useMemo(() => breakdownBySetup(filters.filtered), [filters.filtered]);
  const sessionRows = useMemo(() => breakdownBySession(filters.filtered), [filters.filtered]);
  const behaviorData = useMemo(() => behaviorInsightsFromTrades(filters.filtered), [filters.filtered]);
  const dailyPnl = useMemo(() => buildDailyPnlForChart(filters.filtered), [filters.filtered]);
  const patternRows = useMemo(() => buildPatternBreakdown(filters.filtered), [filters.filtered]);
  const rDistribution = useMemo(() => buildRDistributionForChart(filters.filtered), [filters.filtered]);
  const edgeData = useMemo(
    () => calculateEdgeScore(filters.filtered, initial),
    [filters.filtered, initial]
  );
  const thesis = useMemo(
    () => pickActiveThesis(setupRows, filters.filtered),
    [setupRows, filters.filtered]
  );
  const directives = useMemo(
    () => buildActionDirectives(filters.filtered, stats, sessionRows, behaviorData),
    [filters.filtered, stats, sessionRows, behaviorData]
  );
  const kpiReadings = useMemo(() => buildKpiReadings(stats), [stats]);
  const weeklyPlan = useMemo(
    () => buildWeeklyPlan(filters.filtered, stats, sessionRows, setupRows),
    [filters.filtered, stats, sessionRows, setupRows]
  );
  const insightStack = useMemo(
    () => buildInsightStack(edgeData, thesis, directives),
    [edgeData, thesis, directives]
  );
  const hasSample = stats.count > 0;

  const goJournal = () => window.dispatchEvent(new CustomEvent('mtc-tab', { detail: 'journal' }));

  if (!hasSample) {
    return (
      <main className="page analyticsPro analyticsPage analyticsShell analyticsIntelligenceCenter">
        <AnalyticsHeader
          tradeCount={0}
          activeAccount={filters.activeAccount}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
        />
        <AnalyticsFilters {...filters} />
        <AnalyticsEmptyState onGoJournal={goJournal} count={0} />
      </main>
    );
  }

  return (
    <main className="page analyticsPro analyticsPage analyticsShell analyticsIntelligenceCenter analyticsCockpit">
      <AnalyticsHeader
        tradeCount={stats.count}
        activeAccount={filters.activeAccount}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
      <AnalyticsFilters {...filters} />

      <div className="analyticsCockpitFlow">
        <div className="analyticsZone analyticsZone--command">
          <AnalyticsCommandCenter edgeData={edgeData} />
        </div>

        <div className="analyticsTier3 analyticsZone analyticsZone--intel analyticsZone--primary analyticsZone--canvas">
          <div className="analyticsIntelligenceGrid">
            <div className="analyticsIntelligenceMain">
              <EdgeLab setupRows={setupRows} trades={filters.filtered} hasSample={hasSample} />
            </div>
            <aside className="analyticsIntelligenceSide">
              <AnalyticsInsightStack insights={insightStack} />
              <OperatingProfile
                sessionRows={sessionRows}
                behaviorData={behaviorData}
                stats={stats}
                hasSample={hasSample}
                totalTrades={stats.count}
                compact
              />
              <AnalyticsWeeklyPlan plan={weeklyPlan} compact />
            </aside>
          </div>
        </div>

        <div className="analyticsZone analyticsZone--directives">
          <AnalyticsActionDirectives directives={directives} compact />
        </div>

        <div className="analyticsZone analyticsZone--health">
          <AnalyticsKpiStrip readings={kpiReadings} hasSample={hasSample} compact />
        </div>

        <div className="analyticsTier4 analyticsZone analyticsZone--evidence">
          <PerformanceEvidence
            stats={stats}
            dailyPnl={dailyPnl}
            patternRows={patternRows}
            rDistribution={rDistribution}
            hasSample={hasSample}
          />
        </div>
      </div>
    </main>
  );
}
