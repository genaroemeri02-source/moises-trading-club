import React from 'react';
import { clampScore } from './dashboardUtils.js';

export function DashboardGauge({ value, tone = 'neutral' }) {
  const safe = Number.isFinite(Number(value)) ? clampScore(value) : 0;
  return (
    <div className={`dashboardGauge ${tone}`} style={{ '--value': safe }}>
      <span>{safe}%</span>
    </div>
  );
}

export function MiniSparkline({ data = [], tone = 'neutral' }) {
  const values = (data || []).map(Number).filter(Number.isFinite).slice(-8);
  const safe = values.length > 1 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const points = safe.map((v, i) => `${i * (100 / (safe.length - 1))},${24 - ((v - min) / range) * 18 - 3}`).join(' ');
  return (
    <svg className={`kpiMicroSpark ${tone}`} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

export function KpiMiniGauge({ value = 0, tone = 'neutral' }) {
  const safe = clampScore(value);
  return (
    <div className={`kpiMiniGauge ${tone}`} style={{ '--value': safe }}>
      <span>{safe}</span>
    </div>
  );
}

export function KpiBars({ items = [] }) {
  return (
    <div className="kpiSegmentBar">
      {items.map((item, i) => (
        <i key={i} className={item.tone || 'neutral'} style={{ width: `${Math.max(4, Number(item.value || 0))}%` }} title={item.label} />
      ))}
    </div>
  );
}

export function KpiStreakDots({ count = 0, sign = 0 }) {
  const dots = Array.from({ length: 5 }, (_, i) => i < Math.min(5, Number(count || 0)));
  return (
    <div className={`kpiStreakDots ${sign > 0 ? 'positive' : sign < 0 ? 'negative' : 'neutral'}`}>
      {dots.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}
    </div>
  );
}

export function DashboardKpiCard({ label, value, sub, state = 'neutral', visual, meta }) {
  return (
    <article className={`dashboardProKpi metricPremium ${state}`}>
      <div className="dashboardProKpiTop">
        <span>{label}</span>
        {meta && <em>{meta}</em>}
      </div>
      <b>{value}</b>
      <small>{sub}</small>
      <div className="dashboardProKpiVisual">{visual}</div>
    </article>
  );
}
