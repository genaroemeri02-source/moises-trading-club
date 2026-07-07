import React from 'react';
import { traderReviewScores } from './tradeFormConstants.js';

export function DetailBlock({ title, children }) {
  return (
    <div className="detailBlock">
      <span>{title}</span>
      <div>{children || <em>Sin datos</em>}</div>
    </div>
  );
}

export function TraderBehaviorReviewDetail({ trade }) {
  const scoreValue = (key) => {
    const n = Number(trade?.[key]);
    return n >= 1 && n <= 10 ? `${n}/10` : 'No registrado';
  };
  const textValue = (key) => String(trade?.[key] || '').trim() || 'No registrado';
  return (
    <DetailBlock title="Revisión del Comportamiento del Trader">
      <div className="behaviorReviewDetail">
        {traderReviewScores.map(([key, label]) => <p key={key}><b>{label}:</b> {scoreValue(key)}</p>)}
        <p><b>Respeto del proceso:</b> {textValue('respetoProceso')}</p>
        <p><b>Estado mental antes de operar:</b> {textValue('estadoMental')}</p>
        <p><b>Motivo principal de la operación:</b> {textValue('motivoOperacion')}</p>
        <p><b>Notas de comportamiento:</b> {textValue('notasComportamiento')}</p>
        <p><b>Índice de Calidad Contextual (ICC):</b> {scoreValue('indiceCalidadContextual')}</p>
        <p><b>Alineación macro:</b> {textValue('alineacionMacro')}</p>
        <p><b>Alineación HTF:</b> {textValue('alineacionHTF')}</p>
        <p><b>Alineación intradía:</b> {textValue('alineacionIntra')}</p>
        <p><b>Liquidez clara:</b> {textValue('liquidezClara')}</p>
        <p><b>DXY confirma la tesis:</b> {textValue('dxyConfirma')}</p>
        <p><b>Zona con función institucional:</b> {textValue('zonaConFuncion')}</p>
        <p><b>Notas de contexto:</b> {textValue('notasContexto')}</p>
      </div>
    </DetailBlock>
  );
}
