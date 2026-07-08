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
  buildWeeklyPlan
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
  const directives = useMemo(
    () => buildActionDirectives(filters.filtered, stats, sessionRows, behaviorData),
    [filters.filtered, stats, sessionRows, behaviorData]
  );
  const kpiReadings = useMemo(() => buildKpiReadings(stats), [stats]);
  const weeklyPlan = useMemo(
    () => buildWeeklyPlan(filters.filtered, stats, sessionRows, setupRows),
    [filters.filtered, stats, sessionRows, setupRows]
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
    <main className="page analyticsPro analyticsPage analyticsShell analyticsIntelligenceCenter">
      <AnalyticsHeader
        tradeCount={stats.count}
        activeAccount={filters.activeAccount}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
      <AnalyticsFilters {...filters} />

      <div className="analyticsIntelligenceFold">
        <AnalyticsCommandCenter edgeData={edgeData} />
        <AnalyticsActionDirectives directives={directives} />
        <AnalyticsKpiStrip readings={kpiReadings} hasSample={hasSample} />
      </div>

      <div className="analyticsIntelligenceModules">
        <EdgeLab setupRows={setupRows} trades={filters.filtered} hasSample={hasSample} />
        <OperatingProfile
          sessionRows={sessionRows}
          behaviorData={behaviorData}
          stats={stats}
          hasSample={hasSample}
          totalTrades={stats.count}
        />
      </div>

      <AnalyticsWeeklyPlan plan={weeklyPlan} />

      <PerformanceEvidence
        stats={stats}
        dailyPnl={dailyPnl}
        patternRows={patternRows}
        rDistribution={rDistribution}
        hasSample={hasSample}
      />
    </main>
  );
}
