import React from 'react';
import { normalizeNumInput } from '../../lib/tradeUtils.js';

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function DecimalInput({ className = 'input', value, onChange, placeholder, prefix = '', suffix = '' }) {
  const setVal = (v) => {
    const nv = normalizeNumInput(v);
    if (nv !== null) onChange(nv);
  };
  const handle = (e) => setVal(e.target.value);
  const addDot = () => {
    const s = String(value ?? '');
    if (!s.includes('.') && !s.includes(',')) onChange((s || '0') + '.');
  };
  const toggleMinus = () => {
    const s = String(value ?? '');
    onChange(s.startsWith('-') ? s.slice(1) : ('-' + (s || '')));
  };
  const input = (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={handle}
      onBeforeInput={(e) => {
        const next = String(value ?? '') + String(e.data ?? '');
        if (e.data && normalizeNumInput(next) === null) e.preventDefault();
      }}
    />
  );
  return (
    <div className={`metricInputWrap signedDecimal ${prefix ? 'moneyWrap' : ''}`}>
      {prefix && <em>{prefix}</em>}
      {input}
      <button type="button" className="numAssist" onClick={toggleMinus}>−</button>
      <button type="button" className="numAssist" onClick={addDot}>.</button>
      {suffix && <em>{suffix}</em>}
    </div>
  );
}
