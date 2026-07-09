import { useMemo } from 'react';
import {
  accountInitialForAnalytics,
  buildAnalyticsIntelligence
} from '../../lib/analyticsUtils.js';
import { useAnalyticsFilters } from './useAnalyticsFilters.js';
import { AnalyticsHeader } from './AnalyticsHeader.jsx';
import { AnalyticsFilters } from './AnalyticsFilters.jsx';
import { AnalyticsExecutiveDiagnosis } from './AnalyticsExecutiveDiagnosis.jsx';
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

  const intelligence = useMemo(
    () => buildAnalyticsIntelligence(filters.filtered, { initial }),
    [filters.filtered, initial]
  );

  const {
    sample,
    diagnosis,
    stats,
    setupRows,
    sessionRows,
    behaviorData,
    weeklyPlan,
    insightStack,
    kpiReadings,
    directivesFlat,
    evidence
  } = intelligence;

  const tradeCount = stats.count;
  const hasSample = tradeCount > 0;
  const isForming = sample.quality === 'insufficient';
  const goJournal = () => window.dispatchEvent(new CustomEvent('mtc-tab', { detail: 'journal' }));

  if (!hasSample) {
    return (
      <main className="page analyticsPro analyticsPage analyticsShell analyticsIntelligenceCenter analyticsCockpit">
        <AnalyticsHeader
          tradeCount={0}
          activeAccount={filters.activeAccount}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          sample={sample}
          subtitle="Decision Intelligence · diagnóstico operativo"
        />
        <AnalyticsFilters {...filters} tradeCount={0} />
        <AnalyticsEmptyState onGoJournal={goJournal} count={0} sample={sample} />
      </main>
    );
  }

  return (
    <main className="page analyticsPro analyticsPage analyticsShell analyticsIntelligenceCenter analyticsCockpit">
      <AnalyticsHeader
        tradeCount={tradeCount}
        activeAccount={filters.activeAccount}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        sample={sample}
        subtitle="Decision Intelligence · diagnóstico operativo"
      />
      <AnalyticsFilters {...filters} tradeCount={tradeCount} />

      <div className="analyticsCockpitFlow">
        <div className="analyticsZone analyticsZone--command">
          <AnalyticsExecutiveDiagnosis
            diagnosis={diagnosis}
            sample={sample}
            onGoJournal={goJournal}
          />
        </div>

        {isForming ? (
          <div className="analyticsZone analyticsZone--formation">
            <AnalyticsEmptyState onGoJournal={goJournal} count={tradeCount} sample={sample} compact />
          </div>
        ) : (
          <>
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
                    totalTrades={tradeCount}
                    compact
                  />
                  <AnalyticsWeeklyPlan plan={weeklyPlan} compact />
                </aside>
              </div>
            </div>

            <div className="analyticsZone analyticsZone--directives">
              <AnalyticsActionDirectives directives={directivesFlat} compact />
            </div>

            <div className="analyticsZone analyticsZone--health">
              <AnalyticsKpiStrip readings={kpiReadings} hasSample={hasSample} compact />
            </div>

            <div className="analyticsTier4 analyticsZone analyticsZone--evidence">
              <PerformanceEvidence
                stats={stats}
                dailyPnl={evidence.dailyPnl}
                patternRows={evidence.patternRows}
                rDistribution={evidence.rDistribution}
                hasSample={hasSample}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
