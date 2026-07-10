import React from 'react';
import { CheckCircle2, PauseCircle, ShieldAlert, Heart, Target, AlertTriangle } from 'lucide-react';

const ACTION_META = {
  'complete-checklist': { Icon: CheckCircle2, tab: 'checklist', cta: 'Abrir checklist' },
  pause: { Icon: PauseCircle, tab: 'risk', cta: 'Ver límites' },
  'reduce-risk': { Icon: ShieldAlert, tab: 'risk', cta: 'Abrir Risk Lab' },
  'post-loss-protocol': { Icon: Heart, tab: 'emotional', cta: 'Cerrar sesión emocional' },
  continue: { Icon: Target, tab: 'checklist', cta: 'Validar setup' }
};

function resolveAction(operationalState) {
  const first = Array.isArray(operationalState?.actions) ? operationalState.actions[0] : null;
  if (first?.label) {
    const meta = ACTION_META[first.type] || { Icon: AlertTriangle, tab: 'journal', cta: 'Abrir journal' };
    return {
      title: first.label,
      text: first.detail || operationalState?.summary || 'Acción operativa recomendada.',
      type: first.type || 'continue',
      ...meta
    };
  }

  const status = operationalState?.status || 'caution';
  if (status === 'blocked') {
    return {
      title: 'Pausar operativa',
      text: operationalState?.primaryReason || 'Condiciones de riesgo activas.',
      type: 'pause',
      ...ACTION_META.pause
    };
  }
  return {
    title: 'Continuar con plan',
    text: 'Ejecutar solo setups validados del plan.',
    type: 'continue',
    ...ACTION_META.continue
  };
}

export function DashboardActionCard({ operationalState, stats, onOpenChecklist, onOpenRisk, onOpenJournal, onOpenEmotional, setTab }) {
  const emptyOps = Number(stats?.count || 0) === 0;
  const action = emptyOps
    ? {
        title: 'Cargá tu primer trade o completá checklist inicial.',
        text: 'Sin evidencia operativa suficiente. Activá lectura con el primer registro.',
        type: 'continue',
        Icon: Target,
        tab: 'journal',
        cta: 'Registrar trade'
      }
    : resolveAction(operationalState);
  const Icon = action.Icon;
  const open = () => {
    if (action.tab === 'checklist' && onOpenChecklist) return onOpenChecklist();
    if (action.tab === 'risk' && onOpenRisk) return onOpenRisk();
    if (action.tab === 'emotional' && onOpenEmotional) return onOpenEmotional();
    if (action.tab === 'journal' && onOpenJournal) return onOpenJournal();
    if (typeof setTab === 'function') setTab(action.tab);
  };

  return (
    <article className={`dashboardActionCard dashboardActionCard--${operationalState?.status || 'caution'}`}>
      <div className="dashboardActionCardIcon" aria-hidden="true">
        <Icon size={20} />
      </div>
      <div className="dashboardActionCardBody">
        <span>Próxima acción</span>
        <b>{action.title}</b>
        <p>{action.text}</p>
        <button type="button" className="primary compact" onClick={open}>{action.cta}</button>
      </div>
    </article>
  );
}
