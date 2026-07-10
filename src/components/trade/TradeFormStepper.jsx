import React from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { TRADE_FORM_STEPS } from './tradeFormSteps.js';

/**
 * Visual stepper + footer CTAs for TradeForm.
 * Does not own form state — parent drives currentStep / navigation.
 */
export function TradeFormStepper({
  currentStep = 0,
  onStepChange,
  mode = 'create',
  firstRunHint = false,
  children,
  footer,
  className = ''
}) {
  const step = TRADE_FORM_STEPS[currentStep] || TRADE_FORM_STEPS[0];
  const total = TRADE_FORM_STEPS.length;

  return (
    <div className={`tradeFormStepper ${className}`.trim()} data-mode={mode} data-step={step.id}>
      <div className="tradeFormSteps" role="tablist" aria-label="Pasos del trade">
        {TRADE_FORM_STEPS.map((s, i) => {
          const active = i === currentStep;
          const done = i < currentStep;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={[
                'tradeFormStep',
                active ? 'tradeFormStep--active' : '',
                done ? 'tradeFormStep--done' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => typeof onStepChange === 'function' && onStepChange(i)}
            >
              <span className="tradeFormStepIndex">{done ? <CheckCircle2 size={14} /> : i + 1}</span>
              <span className="tradeFormStepLabel">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tradeFormStepMeta">
        <b>{currentStep + 1}/{total} {step.label}</b>
        {firstRunHint && mode === 'create' && (
          <p>Primer trade: cargá resultado y setup. Podés completar conducta después.</p>
        )}
      </div>

      <div className="tradeFormPanel" role="tabpanel" aria-label={step.label}>
        {children}
      </div>

      {footer}
    </div>
  );
}

export function TradeFormFooter({
  currentStep = 0,
  busy = false,
  isLast = false,
  onBack,
  onNext,
  onSave,
  onCancel,
  saveLabel = 'Guardar'
}) {
  const total = TRADE_FORM_STEPS.length;
  return (
    <div className="tradeFormFooter">
      <div className="tradeFormFooterNav">
        {currentStep > 0 ? (
          <button type="button" className="ghost tradeFormBtnBack" onClick={onBack} disabled={busy}>
            <ChevronLeft size={16} /> Atrás
          </button>
        ) : (
          <button type="button" className="ghost tradeFormBtnCancel" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        )}
        {!isLast ? (
          <button type="button" className="primary tradeFormBtnNext" onClick={onNext} disabled={busy}>
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" className="primary tradeFormBtnSave" onClick={onSave} disabled={busy}>
            {busy ? 'Guardando...' : saveLabel}
          </button>
        )}
      </div>
      <div className="tradeFormFooterMeta">
        <span>{currentStep + 1} de {total}</span>
        {!isLast && (
          <button type="button" className="ghost compact tradeFormBtnSaveEarly" onClick={onSave} disabled={busy}>
            Guardar ahora
          </button>
        )}
      </div>
    </div>
  );
}
