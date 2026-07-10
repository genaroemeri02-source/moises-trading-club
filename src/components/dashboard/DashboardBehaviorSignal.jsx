import React from 'react';
import { Activity, Eye, HeartPulse, Waves } from 'lucide-react';

function resolveBehaviorCopy(emotionIntelligence) {
  const sample = emotionIntelligence?.sample || {};
  const quality = sample.quality || 'empty';
  const signals = emotionIntelligence?.operationalSignals || {};
  const status = emotionIntelligence?.status || 'unknown';
  const profile = emotionIntelligence?.emotionalProfile || {};
  const isCurrent = signals.isCurrent === true;

  if (!emotionIntelligence || quality === 'empty' || status === 'unknown') {
    return {
      tone: 'unknown',
      Icon: Eye,
      title: 'Sin datos emocionales suficientes',
      detail: 'Registrá 5 check-ins para activar lectura emocional.',
      meta: sample.message || 'Muestra emocional vacía'
    };
  }

  // Current-day operational risk only.
  if (isCurrent && (signals.postLossProtocolRequired || signals.shouldBlockTrading || signals.emotionalRisk === 'high')) {
    return {
      tone: 'risk',
      Icon: HeartPulse,
      title: 'Protocolo post-pérdida / riesgo emocional',
      detail: signals.reason
        || emotionIntelligence.primaryRisk
        || 'Condición emocional de la jornada elevada. Pausá nuevas entradas.',
      meta: `Jornada actual · ${signals.source || 'check-in'}`
    };
  }

  if (isCurrent && (signals.shouldReduceRisk || signals.emotionalRisk === 'medium')) {
    const anxiety = Number(signals.anxiety);
    const anxietyHint = Number.isFinite(anxiety) && anxiety >= 7
      ? 'Ansiedad alta en check-in de hoy reduce claridad operativa.'
      : null;
    return {
      tone: 'watch',
      Icon: Waves,
      title: 'Señal emocional de la jornada',
      detail: anxietyHint
        || signals.reason
        || emotionIntelligence.primaryRisk
        || 'Conducta de hoy en observación. Reducí tamaño hasta estabilizar.',
      meta: `Jornada actual · ${signals.sourceDate || 'hoy'}`
    };
  }

  if (!isCurrent) {
    return {
      tone: 'unknown',
      Icon: Eye,
      title: 'Sin check-in emocional de la jornada',
      detail: 'No hay señal emocional actual. El cockpit no bloquea por historial.',
      meta: emotionIntelligence.primaryPattern
        ? `Histórico: ${emotionIntelligence.primaryPattern}`
        : (sample.message || 'Patrones históricos no afectan el estado operativo de hoy')
    };
  }

  if (quality === 'insufficient' || status === 'watch') {
    return {
      tone: 'watch',
      Icon: Eye,
      title: 'Señal emocional en observación',
      detail: emotionIntelligence.primaryRisk
        || 'Muestra corta: registrá más check-ins para confirmar patrón.',
      meta: `${sample.total || 0} registros · progreso ${sample.progressPct || 0}%`
    };
  }

  const dominant = isCurrent ? signals.dominantState : profile.dominantState;
  const positive = dominant === 'calma' || dominant === 'confianza';
  return {
    tone: 'stable',
    Icon: Activity,
    title: positive ? `Estado de hoy: ${dominant}` : 'Lectura emocional de la jornada estable',
    detail: signals.reason
      || emotionIntelligence.summary
      || 'Sin señales adversas en el check-in actual.',
    meta: `${signals.source || 'check-in'} · ${signals.sourceDate || 'hoy'}`
  };
}

export function DashboardBehaviorSignal({ emotionIntelligence, onOpenJournal }) {
  const copy = resolveBehaviorCopy(emotionIntelligence);
  const Icon = copy.Icon;

  return (
    <section className={`dashboardBehaviorSignal dashboardBehaviorSignal--${copy.tone}`}>
      <div className="dashboardBehaviorSignalIcon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="dashboardBehaviorSignalBody">
        <span>Señal emocional / conductual</span>
        <b>{copy.title}</b>
        <p>{copy.detail}</p>
        <small>{copy.meta}</small>
        {(copy.tone === 'unknown' || copy.tone === 'watch') && typeof onOpenJournal === 'function' && (
          <button type="button" className="ghost compact" onClick={onOpenJournal}>
            Ir a journal emocional
          </button>
        )}
      </div>
    </section>
  );
}
