import React from 'react';
import { Card } from '../ui/Card.jsx';
import { clampScore } from './dashboardUtils.js';

export function MtcScoreCard({ s, disciplineScore, hasProfitFactorSample, hasWinLossSample }) {
  const axes = [
    { label: 'Efectividad', value: s.count >= 5 ? clampScore(s.winrate) : null },
    { label: 'Payoff', value: hasWinLossSample ? clampScore(Number(s.payoffRatio || 0) / 2 * 100) : null },
    { label: 'Factor beneficio', value: hasProfitFactorSample ? clampScore(Number(s.profitFactor || 0) / 2 * 100) : null },
    { label: 'Consistencia', value: s.count >= 5 ? clampScore(100 - Math.min(85, Number(s.stdR || 0) * 38)) : null },
    { label: 'Disciplina', value: Number.isFinite(Number(disciplineScore)) ? clampScore(disciplineScore) : null },
    { label: 'Drawdown', value: s.count >= 5 ? clampScore(100 - Math.min(90, Number(s.maxDD || 0) * 10)) : null }
  ];
  const valid = axes.filter(x => Number.isFinite(x.value));
  const scoreReady = s.count >= 10 && valid.length >= 5;
  const score = scoreReady ? clampScore(valid.reduce((sum, x) => sum + x.value, 0) / valid.length) : null;
  const scoreTone = scoreReady ? (score >= 70 ? 'positive' : score >= 45 ? 'neutral' : 'negative') : 'fallback';
  const dash = scoreReady ? `${Math.round((score / 100) * 339)} 339` : '0 339';
  return (
    <Card title="MTC Score" sub={scoreReady ? 'Score compuesto de ventaja, disciplina y riesgo.' : 'Sin muestra suficiente · requiere +10 operaciones.'} className="dashboardMtcScoreCard">
      <div className="dashboardMtcScoreBody">
        <div className="dashboardMtcScoreGauge">
          <div className={`dashboardMtcScoreRing ${scoreTone}`}>
            <svg viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="54" /><circle cx="65" cy="65" r="54" pathLength="339" strokeDasharray={dash} /></svg>
            <div><b>{scoreReady ? score : '—'}</b><small>/100</small></div>
          </div>
          <span>{scoreReady ? 'MTC Score' : 'Muestra insuficiente'}</span>
        </div>
        <div className="dashboardMtcAxes">
          {axes.map(axis => (
            <div key={axis.label} className={axis.value == null ? 'muted' : ''}>
              <span>{axis.label}</span>
              <i><em style={{ width: `${axis.value ?? 0}%` }} /></i>
              <b>{axis.value == null ? '—' : `${axis.value}`}</b>
            </div>
          ))}
          {!scoreReady && <p>Requiere +10 operaciones para activar el score compuesto.</p>}
        </div>
      </div>
    </Card>
  );
}
