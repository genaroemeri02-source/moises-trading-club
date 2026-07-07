import React from 'react';
import { Field } from './TradeFormField.jsx';
import { TextareaWithEmoji } from './TradeTextarea.jsx';
import {
  traderReviewScores,
  respetoProcesoOptions,
  estadoMentalOptions,
  motivoOperacionOptions,
  alineacionContextualOptions,
  siParcialNoOptions,
  dxyConfirmaOptions
} from './tradeFormConstants.js';

export function TraderBehaviorReviewFields({ form, ch }) {
  return (
    <div className="behaviorReviewSection">
      <div><h3>Revisión del Comportamiento del Trader</h3></div>
      <div className="formGrid labeled">
        {traderReviewScores.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <input className="input" type="number" min="1" max="10" step="1" placeholder="1 a 10" value={form[key] ?? ''} onChange={e => ch(key, e.target.value)} />
          </Field>
        ))}
        <Field label="Respeto del proceso">
          <select className="input" value={form.respetoProceso || ''} onChange={e => ch('respetoProceso', e.target.value)}>
            <option value="">Seleccionar...</option>
            {respetoProcesoOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Estado mental antes de operar">
          <select className="input" value={form.estadoMental || ''} onChange={e => ch('estadoMental', e.target.value)}>
            <option value="">Seleccionar...</option>
            {estadoMentalOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Motivo principal de la operación">
          <select className="input" value={form.motivoOperacion || ''} onChange={e => ch('motivoOperacion', e.target.value)}>
            <option value="">Seleccionar...</option>
            {motivoOperacionOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <div className="wide">
          <Field label="Notas de comportamiento">
            <TextareaWithEmoji className="input" value={form.notasComportamiento || ''} onChange={e => ch('notasComportamiento', e.target.value)} placeholder="¿Qué pensé, sentí o hice bien/mal durante esta operación?" />
          </Field>
        </div>
        <div className="behaviorReviewSubhead wide"><h4>Índice de Calidad Contextual (ICC)</h4></div>
        <Field label="Índice de Calidad Contextual (ICC)" hint="¿Qué tan válido era el contexto general de esta operación?">
          <input className="input" type="number" min="1" max="10" step="1" placeholder="1 a 10" value={form.indiceCalidadContextual ?? ''} onChange={e => ch('indiceCalidadContextual', e.target.value)} />
        </Field>
        <Field label="Alineación macro">
          <select className="input" value={form.alineacionMacro || ''} onChange={e => ch('alineacionMacro', e.target.value)}>
            <option value="">Seleccionar...</option>
            {alineacionContextualOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Alineación HTF">
          <select className="input" value={form.alineacionHTF || ''} onChange={e => ch('alineacionHTF', e.target.value)}>
            <option value="">Seleccionar...</option>
            {alineacionContextualOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Alineación intradía">
          <select className="input" value={form.alineacionIntra || ''} onChange={e => ch('alineacionIntra', e.target.value)}>
            <option value="">Seleccionar...</option>
            {alineacionContextualOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Liquidez clara">
          <select className="input" value={form.liquidezClara || ''} onChange={e => ch('liquidezClara', e.target.value)}>
            <option value="">Seleccionar...</option>
            {siParcialNoOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="DXY confirma la tesis">
          <select className="input" value={form.dxyConfirma || ''} onChange={e => ch('dxyConfirma', e.target.value)}>
            <option value="">Seleccionar...</option>
            {dxyConfirmaOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Zona con función institucional" hint="La zona no se evalúa por el dibujo, sino por su función dentro de la narrativa.">
          <select className="input" value={form.zonaConFuncion || ''} onChange={e => ch('zonaConFuncion', e.target.value)}>
            <option value="">Seleccionar...</option>
            {siParcialNoOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <div className="wide">
          <Field label="Notas de contexto">
            <TextareaWithEmoji className="input" value={form.notasContexto || ''} onChange={e => ch('notasContexto', e.target.value)} placeholder="¿Por qué esta zona tenía o no tenía validez institucional?" />
          </Field>
        </div>
      </div>
    </div>
  );
}
