import React from 'react';
import { Field } from './TradeFormField.jsx';
import { TextareaWithEmoji } from './TradeTextarea.jsx';
import { mentorReviewFocusOptions } from './tradeFormConstants.js';

export function MentorReviewRequest({ form, ch }) {
  const requested = !!form.mentorReviewRequested;
  return (
    <div className={`mentorReviewRequest ${requested ? 'on' : ''}`}>
      <div>
        <b>Revisión del mentor</b>
        <p>Marcá este trade para que el mentor revise entrada, timing, gestión, contexto o psicología.</p>
      </div>
      <label className="switchLine">
        <input type="checkbox" checked={requested} onChange={e => ch('mentorReviewRequested', e.target.checked)} />
        <span>Enviar este trade a revisión del mentor</span>
      </label>
      {requested && (
        <div className="formGrid labeled">
          <Field label="¿Qué querés que revise?">
            <select className="input" value={form.mentorReviewFocus || 'general'} onChange={e => ch('mentorReviewFocus', e.target.value)}>
              {mentorReviewFocusOptions.map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Nota para el mentor">
            <TextareaWithEmoji className="input" value={form.mentorReviewNote || ''} onChange={e => ch('mentorReviewNote', e.target.value)} placeholder="Ej: quiero saber si entré tarde o si el contexto era válido." />
          </Field>
        </div>
      )}
    </div>
  );
}
