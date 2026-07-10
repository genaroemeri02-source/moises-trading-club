import React from 'react';
import { Shield, AlertTriangle, Ban, Gauge } from 'lucide-react';
import { DashboardActionCard } from './DashboardActionCard.jsx';
import { DashboardRiskSnapshot } from './DashboardRiskSnapshot.jsx';
import { DashboardBehaviorSignal } from './DashboardBehaviorSignal.jsx';

const STATUS_META = {
  ready: { Icon: Shield, label: 'Apto', className: 'ready' },
  caution: { Icon: AlertTriangle, label: 'Precaución', className: 'caution' },
  blocked: { Icon: Ban, label: 'Bloqueado', className: 'blocked' }
};

export const FALLBACK_OPERATIONAL_STATE = Object.freeze({
  status: 'caution',
  label: 'Precaución',
  severity: 'warning',
  score: 55,
  summary: 'Datos operativos incompletos.',
  primaryReason: 'Información parcial',
  reasons: [],
  actions: [{
    type: 'reduce-risk',
    label: 'Operar con precaución',
    detail: 'Cargá tu primer trade o completá checklist inicial.'
  }],
  inputs: {
    dailyPnl: 0,
    weeklyPnl: 0,
    dailyR: 0,
    weeklyR: 0,
    tradesToday: 0,
    maxTradesPerDay: 1,
    dailyLossLimitHit: false,
    weeklyLossLimitHit: false,
    drawdownLimitHit: false,
    recentLoss: false,
    checklistComplete: true,
    emotionalRisk: 'unknown'
  }
});

export function DashboardCockpitPanel({
  operationalState,
  emotionIntelligence,
  stats,
  setTab,
  onOpenChecklist,
  onOpenRisk,
  onOpenJournal,
  onOpenEmotional
}) {
  const state = operationalState?.status
    ? operationalState
    : FALLBACK_OPERATIONAL_STATE;
  const meta = STATUS_META[state.status] || STATUS_META.caution;
  const StatusIcon = meta.Icon;
  const score = Number.isFinite(Number(state.score)) ? Math.round(Number(state.score)) : null;
  const tradeCount = Number(stats?.count || 0);
  const usingDefaults = tradeCount === 0 && (state.inputs?.emotionalRisk === 'unknown');

  return (
    <section className={`dashboardCockpit dashboardCockpit--${meta.className}`} data-status={state.status}>
      <header className="dashboardCockpitHeader">
        <div className="dashboardCockpitHeaderMain">
          <span className="dashboardCockpitEyebrow">Estado operativo</span>
          <span className={`dashboardCockpitBadge dashboardCockpitBadge--${meta.className}`}>
            <StatusIcon size={14} />
            {state.label || meta.label}
          </span>
          <h2>Lectura operativa actual</h2>
          <p className="dashboardCockpitSummary">{state.summary}</p>
        </div>
        <div className="dashboardPulseScore" aria-label="Pulso operativo">
          <Gauge size={16} />
          <div>
            <span>Pulso</span>
            <b>{score != null ? score : '—'}</b>
            <small>{usingDefaults ? 'Reglas base activas' : 'Score operativo'}</small>
          </div>
        </div>
      </header>

      <div className="dashboardCockpitReason">
        <span>Razón principal</span>
        <b>{state.primaryReason || 'Sin alertas activas'}</b>
      </div>

      <div className="dashboardCockpitGrid">
        <DashboardActionCard
          operationalState={state}
          stats={stats}
          setTab={setTab}
          onOpenChecklist={onOpenChecklist}
          onOpenRisk={onOpenRisk}
          onOpenJournal={onOpenJournal}
          onOpenEmotional={onOpenEmotional}
        />
        <DashboardRiskSnapshot
          operationalState={state}
          emotionIntelligence={emotionIntelligence}
        />
        <DashboardBehaviorSignal
          emotionIntelligence={emotionIntelligence}
          onOpenJournal={onOpenEmotional || onOpenJournal}
        />
      </div>
    </section>
  );
}
