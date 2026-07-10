import React from 'react';
import { Activity, Eye, HeartPulse, Waves } from 'lucide-react';

function resolveBehaviorCopy(emotionIntelligence) {
  const sample = emotionIntelligence?.sample || {};
  const quality = sample.quality || 'empty';
  const signals = emotionIntelligence?.operationalSignals || {};
  const status = emotionIntelligence?.status || 'unknown';
  const profile = emotionIntelligence?.emotionalProfile || {};

  if (!emotionIntelligence || quality === 'empty' || status === 'unknown') {
    return {
      tone: 'unknown',
      Icon: Eye,
      title: 'Sin datos emocionales suficientes',
      detail: 'Registrá 5 check-ins para activar lectura emocional.',
      meta: sample.message || 'Muestra emocional vacía'
    };
  }

  if (quality === 'insufficient') {
    return {
      tone: 'watch',
      Icon: Eye,
      title: 'Señal emocional en observación',
      detail: emotionIntelligence.primaryRisk
        || 'Muestra corta: registrá más check-ins para confirmar patrón.',
      meta: `${sample.total || 0} registros · progreso ${sample.progressPct || 0}%`
    };
  }

  if (signals.postLossProtocolRequired || signals.shouldBlockTrading || status === 'risk') {
    return {
      tone: 'risk',
      Icon: HeartPulse,
      title: 'Protocolo post-pérdida / riesgo emocional',
      detail: emotionIntelligence.primaryRisk
        || signals.reason
        || 'Condición emocional elevada. Pausá nuevas entradas.',
      meta: emotionIntelligence.primaryPattern || profile.dominantState || 'risk'
    };
  }

  if (signals.shouldReduceRisk || status === 'watch' || signals.emotionalRisk === 'medium') {
    const anxiety = Number(signals.anxiety);
    const anxietyHint = Number.isFinite(anxiety) && anxiety >= 7
      ? 'Ansiedad alta reduce claridad operativa.'
      : null;
    return {
      tone: 'watch',
      Icon: Waves,
      title: 'Señal emocional en observación',
      detail: anxietyHint
        || emotionIntelligence.primaryRisk
        || signals.reason
        || emotionIntelligence.primaryPattern
        || 'Conducta en observación. Reducí tamaño hasta estabilizar.',
      meta: emotionIntelligence.primaryPattern || profile.dominantState || 'watch'
    };
  }

  const dominant = profile.dominantState;
  const positive = dominant === 'calma' || dominant === 'confianza';
  return {
    tone: 'stable',
    Icon: Activity,
    title: positive ? `Estado dominante: ${dominant}` : 'Lectura emocional estable',
    detail: emotionIntelligence.summary
      || 'Sin señales conductuales adversas en la muestra actual.',
    meta: emotionIntelligence.primaryPattern || `${sample.total || 0} registros`
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
