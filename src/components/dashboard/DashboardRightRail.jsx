import React from 'react';
import {
  CheckCircle2, Target, FileText, Plus, Heart, BarChart3
} from 'lucide-react';
import { money, formatMoneyCompactCard, formatPercentCard, formatCalendarR } from '../../lib/formatUtils.js';
import { tradingDayKey, getTradeOperationalDateKey } from '../../lib/dateUtils.js';
import { Card } from '../ui/Card.jsx';
import { DashboardChartFallback, MtcLightweightLineChart } from './MtcLightweightLineChart.jsx';

function RecommendedActionCard({ data, setTab }) {
  const hasChecklist = (data.checklists || []).length > 0;
  const hasTrades = (data.trades || []).length > 0;
  const hasEmotional = (data.emotionalJournals || []).length > 0;
  const todayKey = tradingDayKey();
  const todayTrades = (data.trades || []).filter(t => getTradeOperationalDateKey(t) === todayKey);
  const todayPlan = (data.dailyPlans || []).find(p => (p.dayKey || p.date) === todayKey);
  const action = !hasChecklist
    ? { icon: CheckCircle2, title: 'Completar checklist', text: 'Validá contexto, zona y riesgo antes de buscar entrada.', cta: 'Abrir checklist', target: 'checklist' }
    : todayPlan && !todayTrades.length
      ? { icon: Target, title: 'Esperar setup válido', text: 'Hay plan para hoy. La siguiente acción es ejecutar solo si aparece el patrón.', cta: 'Ver jornada', target: 'journal' }
      : todayTrades.length
        ? { icon: FileText, title: 'Revisar ejecución', text: 'Ya hay operaciones registradas. Cerrá lectura de conducta y aprendizaje.', cta: 'Ver journal', target: 'journal' }
        : !hasTrades
          ? { icon: Plus, title: 'Registrar jornada', text: 'Cargá plan o primer trade para activar lectura operativa real.', cta: 'Registrar trade', target: 'journal' }
          : !hasEmotional
            ? { icon: Heart, title: 'Cerrar revisión', text: 'Dejá registrado estado emocional y corrección concreta de la sesión.', cta: 'Cerrar sesión', target: 'emotional' }
            : { icon: BarChart3, title: 'Revisar métricas', text: 'Usá analytics para detectar consistencia, riesgo y calidad de ejecución.', cta: 'Revisar analytics', target: 'analytics' };
  const Icon = action.icon;
  return (
    <Card title="Próxima acción" sub="Basada en tu actividad real registrada." className="nextActionCard">
      <div className="nextActionBody">
        <span><Icon size={22} /></span>
        <div>
          <b>{action.title}</b>
          <p>{action.text}</p>
          <button className="primary compact" onClick={() => setTab(action.target)}>{action.cta}</button>
        </div>
      </div>
    </Card>
  );
}

function EquityCurvePreview({ s }) {
  const change = s.total;
  const hasCurve = (s.curve || []).length >= 2;
  return (
    <Card title="Curva de equity" sub={hasCurve ? `Equity actual ${money(s.equity)} · ${change >= 0 ? '+' : ''}${money(change)}` : 'Curva en formación · se necesitan más operaciones'} className="equityPreviewCard dashboardEquityCompact">
      {hasCurve ? <MtcLightweightLineChart data={s.curve} mode="equity" height={190} compact currency={money} /> : <DashboardChartFallback compact />}
    </Card>
  );
}

export function DashboardRightRail({
  scopedData,
  setTab,
  s,
  disciplineReady,
  disciplineScore,
  qualityLabel,
  riskTone,
  riskLevel,
  riskGuard,
  riskSettings,
  todayTrades,
  dayPnL,
  weekWr,
  weekTrades,
  mapReady,
  monthly,
  mainSession
}) {
  return (
    <aside className="dashboardRightRail">
      <RecommendedActionCard data={scopedData} setTab={setTab} />
      <Card title="Disciplina" sub="Conducta, plan y calidad." className="dashboardDisciplineCard">
        <div className={`dashboardScorePanel ${disciplineReady ? 'ready' : 'isFallback'}`}>
          <div className={`dashboardDisciplineBadge ${disciplineReady ? 'ready' : 'isFallback'}`}>
            <b>{disciplineReady ? `${disciplineScore}/100` : 'Pendiente'}</b>
            <small>{disciplineReady ? 'Score operativo' : 'Requiere +5 operaciones'}</small>
          </div>
          <div>
            <span>{disciplineReady ? 'Score de conducta' : 'Muestra insuficiente'}</span>
            <p>{disciplineReady ? `${Math.round(s.discipline || 0)}% plan · Conducta ${Math.round(s.behaviorAvg || 0)}/100 · Calidad ${qualityLabel}` : 'Requiere +5 operaciones'}</p>
          </div>
        </div>
      </Card>
      <Card title="Riesgo operativo" sub="Límites y estado actual." className={`dashboardRiskCard ${riskTone}`}>
        <div className="dashboardRiskList">
          <div><span>Estado</span><b>{riskLevel}</b><small>{riskGuard.blocked ? (riskGuard.reasons[0] || 'Límite operativo activo') : 'Sin bloqueo operativo'}</small></div>
          <div><span>Riesgo diario</span><b>{money(riskSettings.maxDailyLoss)}</b><small>Máx. pérdida configurada</small></div>
          <div><span>Operaciones hoy</span><b>{todayTrades.length}/{riskSettings.maxTradesDay || '—'}</b><small>P/L día {formatMoneyCompactCard(dayPnL)}</small></div>
          <div><span>Efectividad semanal</span><b>{formatPercentCard(weekWr)}</b><small>{weekTrades.length} operaciones registradas</small></div>
        </div>
      </Card>
      <Card title="Mapa operativo" sub={mapReady ? `${mainSession} · ${monthly.days} día${monthly.days === 1 ? '' : 's'} operado${monthly.days === 1 ? '' : 's'}` : 'Lectura mensual en formación.'} className="dashboardMapCard">
        <div className="dashboardMapGrid">
          <div><span>Mes</span><b>{monthly.wins} ganada{monthly.wins === 1 ? '' : 's'} · {monthly.losses} pérdida{monthly.losses === 1 ? '' : 's'} · {monthly.be} BE</b><small>Resultado {formatCalendarR(monthly.r)}</small></div>
          <div><span>Resultado R</span><b>{formatCalendarR(monthly.r)}</b><small>{formatMoneyCompactCard(monthly.total)}</small></div>
          <div><span>Sesión principal</span><b>{mapReady ? mainSession : 'Pendiente'}</b><small>{mapReady ? 'Mayor frecuencia operativa' : 'Sin datos suficientes'}</small></div>
          <div><span>Calidad promedio</span><b>{mapReady ? qualityLabel : '—'}</b><small>{mapReady ? `${Math.round(s.qualityAvg || 0)}/100` : 'Sin muestra suficiente'}</small></div>
        </div>
      </Card>
      <EquityCurvePreview s={s} />
    </aside>
  );
}
