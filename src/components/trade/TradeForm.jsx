import React, { useEffect, useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { toNumberSafe, safeArray, normalizedAccounts } from '../../lib/tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from '../../lib/analyticsUtils.js';
import { Field, DecimalInput } from './TradeFormField.jsx';
import { TextareaWithEmoji } from './TradeTextarea.jsx';
import { MentorReviewRequest } from './MentorReviewRequest.jsx';
import { TraderBehaviorReviewFields } from './TraderBehaviorReviewFields.jsx';
import { TradeFormFooter, TradeFormStepper } from './TradeFormStepper.jsx';
import { createTradeFormChangeHandler } from './tradeFormState.js';
import {
  checklistBase,
  emotionBeforeOptions,
  executionBehaviorOptions,
  postTradeBehaviorOptions,
  moisesPatterns,
  moisesConfluences,
  tradeResultOptions,
  tradeSessionOptions,
  tradeQualityOptions
} from './tradeFormConstants.js';
import { persistTrade, tradeSaveErrorMessage, tradeSaveSuccessMessage } from './tradeSavePipeline.js';
import {
  TRADE_FORM_STEPS,
  FOLLOWED_PLAN_OPTIONS,
  CHECKLIST_COMPLETE_OPTIONS,
  MISTAKE_TYPE_OPTIONS,
  validateTradeStep,
  getTradeFormSoftWarnings,
  buildTradeSummary,
  resolveFollowedPlanFields,
  resolveChecklistCompleteFields,
  resolveChecklistQualityFields
} from './tradeFormSteps.js';
import { TradeTagsPicker } from './TradeTagsPicker.jsx';
import { normalizeTradeTags } from '../../lib/tradeTags.js';

function ynSelectValue(form, key, trueLabel = 'Sí', falseLabel = 'No') {
  if (form[`${key}Label`]) return form[`${key}Label`];
  if (form[key] === true) return trueLabel;
  if (form[key] === false) return falseLabel;
  return '';
}

export function TradeForm({ form, setForm, profile, data, db, uploadFile, uid, toast, firstRunHint = false }) {
  const [busy, setBusy] = useState(false);
  const [captureFileObj, setCaptureFileObj] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const accountOptions = normalizedAccounts(data?.settings || {});
  const selectedAccountValue = accountOptions.some(a => a.name === form.account) ? form.account : (accountOptions[0]?.name || 'Cuenta principal');
  const formChecklist = safeArray(form.checklist);
  const formConfluences = safeArray(form.confluencesUsed);
  const formExecutionBehaviors = safeArray(form.executionBehaviors);
  const formTags = normalizeTradeTags(form.tags);
  const ch = createTradeFormChangeHandler(setForm);
  const toggle = (x) => ch('checklist', formChecklist.includes(x) ? formChecklist.filter(a => a !== x) : [...formChecklist, x]);
  const toggleConfluence = (x) => ch('confluencesUsed', formConfluences.includes(x) ? formConfluences.filter(a => a !== x) : [...formConfluences, x]);
  const mode = form.id ? 'edit' : 'create';
  const softWarnings = getTradeFormSoftWarnings(form);
  const summary = buildTradeSummary(form, { accountValue: selectedAccountValue });
  const isLast = currentStep >= TRADE_FORM_STEPS.length - 1;

  useEffect(() => {
    setCurrentStep(0);
    setErrors({});
  }, [form?.id, form?.createdFromChecklist]);

  async function save() {
    const hard = validateTradeStep(form, 'result', { accountValue: selectedAccountValue });
    if (!hard.ok) {
      setErrors(hard.errors);
      setCurrentStep(0);
      toast(Object.values(hard.errors)[0] || 'Completá los campos mínimos.', 'error');
      return;
    }
    setBusy(true);
    try {
      let captureUrl = form.captureUrl || '';
      if (captureFileObj) {
        try {
          captureUrl = await uploadFile(`users/${profile.uid}/trades/${uid()}-${captureFileObj.name}`, captureFileObj);
        } catch (e) {
          console.warn('Captura no guardada', e?.message);
        }
      }
      const planFields = resolveFollowedPlanFields(form.followedPlanLabel || ynSelectValue(form, 'followedPlan'));
      const checklistFields = resolveChecklistCompleteFields(
        form.checklistCompleteLabel || ynSelectValue(form, 'checklistComplete'),
        formChecklist
      );
      const qualityFields = resolveChecklistQualityFields({ ...form, ...checklistFields });
      const enriched = {
        ...form,
        account: selectedAccountValue,
        asset: String(form.asset || '').trim() || 'Sin activo',
        ...planFields,
        ...checklistFields,
        ...qualityFields,
        mistakeType: form.mistakeType || form.postTradeBehavior || '',
        notes: form.notes || form.lesson || form.privateJournal || ''
      };
      const result = await persistTrade({
        db,
        form: enriched,
        profile,
        selectedAccountValue,
        captureUrl,
        serverTimestamp
      });
      if (!result.ok) {
        if (result.validationError) toast(result.validationError, 'error');
        return;
      }
      toast(tradeSaveSuccessMessage(result));
      setForm(null);
    } catch (e) {
      console.error('saveTrade:error', e);
      toast(tradeSaveErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  function captureFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCaptureFileObj(f);
    ch('captureFileName', f.name);
  }

  function goNext() {
    const stepId = TRADE_FORM_STEPS[currentStep]?.id;
    if (stepId === 'result') {
      const hard = validateTradeStep(form, 'result', { accountValue: selectedAccountValue });
      setErrors(hard.errors);
      if (!hard.ok) {
        toast(Object.values(hard.errors)[0] || 'Completá Resultado antes de continuar.', 'error');
        return;
      }
    }
    setCurrentStep(s => Math.min(TRADE_FORM_STEPS.length - 1, s + 1));
  }

  function goBack() {
    setCurrentStep(s => Math.max(0, s - 1));
  }

  const resultClass = toNumberSafe(form.resultMoney) > 0 ? 'resultPreview pos' : toNumberSafe(form.resultMoney) < 0 ? 'resultPreview neg' : 'resultPreview';
  const quickFromChecklist = !!form.createdFromChecklist;
  const followedPlanValue = form.followedPlanLabel || ynSelectValue(form, 'followedPlan');
  const checklistCompleteValue = form.checklistCompleteLabel || ynSelectValue(form, 'checklistComplete');

  function setFollowedPlan(label) {
    const fields = resolveFollowedPlanFields(label);
    setForm(prev => ({ ...prev, followedPlanLabel: label, ...fields }));
  }

  function setChecklistComplete(label) {
    const fields = resolveChecklistCompleteFields(label, formChecklist);
    setForm(prev => ({ ...prev, checklistCompleteLabel: label, ...fields }));
  }

  if (quickFromChecklist) {
    const preloadedRows = [
      ['Activo', form.asset],
      ['Sesión', form.session],
      ['Dirección', form.side],
      ['Sistema', form.tradeSystem || form.system || 'Sistema de Moisés'],
      ['Patrón', form.checklistPattern || form.pattern],
      ['Zona M15', form.checklistZoneM15 || form.zoneM15],
      ['Liquidez', form.checklistLiquidity || form.liquidityTaken],
      ['Score', form.checklistScore != null ? `${form.checklistScore}/100` : '—'],
      ['Luz verde', form.checklistFinalGreen ? 'Sí' : 'No']
    ];
    return (
      <Card title="Trade rápido desde Checklist" sub="Completá resultado y comportamiento. Los datos técnicos ya vienen desde la validación." className="tradeFormCard quickChecklistTradeForm">
        <div className={`quickChecklistBanner ${form.checklistFinalGreen ? 'ok' : 'warn'}`}>
          <CheckCircle2 size={18} />
          <div>
            <b>{form.checklistFinalGreen ? 'Luz verde vinculada' : 'Checklist sin luz verde'}</b>
            <p>{form.checklistFinalGreen ? 'Este trade nace de una validación completa. Solo cargá resultado, R y comportamiento.' : 'Este trade quedará marcado como ejecución sin checklist completo.'}</p>
          </div>
        </div>
        <div className="formGrid labeled quickTradeMinimal">
          <Field label="Resultado" hint="Campo mínimo requerido para guardar.">
            <select className="input" value={form.result || ''} onChange={e => ch('result', e.target.value)}>
              <option value="">Seleccionar resultado...</option>
              {tradeResultOptions.map(x => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Estado emocional antes">
            <select className="input" value={form.emotionBefore || ''} onChange={e => ch('emotionBefore', e.target.value)}>
              <option value="">Seleccionar...</option>
              {emotionBeforeOptions.map(x => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <div className="resultStrip resultHero editableResults">
          <div className={resultClass}><span>Ganancia / Pérdida en $</span><DecimalInput className="resultLiveInput" value={form.resultMoney} onChange={v => ch('resultMoney', v)} placeholder="300" prefix="$" /><small>Dinero generado o perdido en este trade.</small></div>
          <div className={resultClass}><span>Ganancia / Pérdida en %</span><DecimalInput className="resultLiveInput" value={form.resultPct} onChange={v => ch('resultPct', v)} placeholder="2.5" suffix="%" /><small>% hecho o perdido sobre la cuenta.</small></div>
          <div className={resultClass}><span>Resultado en R</span><DecimalInput className="resultLiveInput" value={form.resultR} onChange={v => ch('resultR', v)} placeholder="3" suffix="R" /><small>Multiplicador de riesgo.</small></div>
        </div>
        <div className="behaviorJournal quickBehavior">
          <div><h3>Comportamiento del trader</h3><p>Medí proceso, no solo resultado. Esto separa disciplina real de suerte.</p></div>
          <div className="formGrid labeled">
            <Field label="Después del trade">
              <select className="input" value={form.postTradeBehavior || ''} onChange={e => ch('postTradeBehavior', e.target.value)}>
                <option value="">Seleccionar...</option>
                {postTradeBehaviorOptions.map(x => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <div className="behaviorScoreBox">
              <span>Score de conducta</span>
              <b>{behaviorScoreFromTrade(form)}/100</b>
              <small>{behaviorScoreLabel(behaviorScoreFromTrade(form))}</small>
            </div>
          </div>
          <Field label="Durante la ejecución" hint="Podés marcar varias.">
            <div className="chipSelect behaviorChips">
              {executionBehaviorOptions.map(x => (
                <button type="button" key={x} className={formExecutionBehaviors.includes(x) ? 'on' : ''} onClick={() => ch('executionBehaviors', formExecutionBehaviors.includes(x) ? formExecutionBehaviors.filter(a => a !== x) : [...formExecutionBehaviors, x])}>
                  {formExecutionBehaviors.includes(x) ? '✓ ' : ''}{x}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <TraderBehaviorReviewFields form={form} ch={ch} />
        <Field label="Comentario / lección" hint="Qué aprendiste, qué repetir y qué corregir.">
          <TextareaWithEmoji className="input" value={form.lesson || ''} onChange={e => ch('lesson', e.target.value)} placeholder="Ej: ejecuté limpio, respeté la zona y confirmé patrón..." />
        </Field>
        <MentorReviewRequest form={form} ch={ch} />
        <details className="preloadedChecklistDetails" open={false}>
          <summary>Datos precargados desde el Checklist</summary>
          <div className="preloadedGrid">{preloadedRows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v || '—'}</b></div>)}</div>
          <div className="formGrid labeled compactEdit">
            <Field label="Activo"><input className="input" value={form.asset || ''} onChange={e => ch('asset', e.target.value.toUpperCase())} /></Field>
            <Field label="Sesión">
              <select className="input" value={form.session || 'NY'} onChange={e => ch('session', e.target.value)}>
                {tradeSessionOptions.map(x => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Dirección">
              <select className="input" value={form.side || 'BUY'} onChange={e => ch('side', e.target.value)}>
                <option>BUY</option><option>SELL</option>
              </select>
            </Field>
            <Field label="Sistema">
              <select className="input" value={form.tradeSystem || 'Sistema de Moisés'} onChange={e => ch('tradeSystem', e.target.value)}>
                <option>Sistema de Moisés</option><option>Otro</option>
              </select>
            </Field>
          </div>
        </details>
        <div className="row">
          <button className="primary" onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar trade'}</button>
          <button className="ghost" onClick={() => setForm(null)}>Cancelar</button>
        </div>
      </Card>
    );
  }

  const stepId = TRADE_FORM_STEPS[currentStep]?.id || 'result';

  return (
    <Card
      title={form.id ? 'Editar trade' : 'Nuevo trade'}
      sub={firstRunHint && !form.id
        ? 'Primer trade: cargá resultado y setup. Podés completar conducta después.'
        : 'Flujo guiado: resultado → setup → conducta → evidencia. En mobile, un paso a la vez.'}
      className="tradeFormCard tradeFormCard--stepped"
    >
      <TradeFormStepper
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        mode={mode}
        firstRunHint={firstRunHint && !form.id}
        footer={(
          <TradeFormFooter
            currentStep={currentStep}
            busy={busy}
            isLast={isLast}
            onBack={goBack}
            onNext={goNext}
            onSave={save}
            onCancel={() => setForm(null)}
            saveLabel={form.id ? 'Guardar cambios' : 'Guardar trade'}
          />
        )}
      >
        {stepId === 'result' && (
          <div className="tradeFormFieldGroup">
            <div className="tradeGuide">
              <Sparkles size={18} />
              <div><b>Paso 1 — Resultado</b><p>Mínimo: fecha, cuenta, activo, resultado y P/L o R. El resto es opcional.</p></div>
            </div>
            <div className="resultStrip resultHero editableResults">
              <div className={resultClass}><span>Ganancia / Pérdida en $</span><DecimalInput className="resultLiveInput" value={form.resultMoney} onChange={v => ch('resultMoney', v)} placeholder="300" prefix="$" /><small>Dinero generado o perdido. Ej: -150.50</small></div>
              <div className={resultClass}><span>Ganancia / Pérdida en %</span><DecimalInput className="resultLiveInput" value={form.resultPct} onChange={v => ch('resultPct', v)} placeholder="2.5" suffix="%" /><small>% sobre la cuenta. Opcional si ya cargás $ o R.</small></div>
              <div className={resultClass}><span>Resultado en R</span><DecimalInput className="resultLiveInput" value={form.resultR} onChange={v => ch('resultR', v)} placeholder="3" suffix="R" /><small>Multiplicador de riesgo. Stop completo = -1R.</small></div>
            </div>
            {errors.metric && <p className="tradeFormWarning tradeFormWarning--error">{errors.metric}</p>}
            <div className="tradeFormGrid formGrid labeled">
              <Field label="Fecha" hint={errors.date || 'Día operativo del trade.'}>
                <input className={`input ${errors.date ? 'tradeFormInput--error' : ''}`} type="date" value={form.date || ''} onChange={e => ch('date', e.target.value)} />
              </Field>
              <Field label="Resultado" hint={errors.result || 'Win / Loss / BE (Profit, Stop, BE…).'}>
                <select className={`input ${errors.result ? 'tradeFormInput--error' : ''}`} value={form.result || ''} onChange={e => ch('result', e.target.value)}>
                  <option value="">Seleccionar resultado...</option>
                  {tradeResultOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Cuenta / challenge" hint={errors.account || 'Configura cuentas desde Perfil.'}>
                <select className={`input ${errors.account ? 'tradeFormInput--error' : ''}`} value={selectedAccountValue} onChange={e => ch('account', e.target.value)}>
                  {accountOptions.map(a => <option key={a.name}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Activo" hint="Si lo dejás vacío se guarda como 'Sin activo'.">
                <input className="input" placeholder="XAUUSD, NAS100, EURUSD..." value={form.asset || ''} onChange={e => ch('asset', e.target.value.toUpperCase())} />
              </Field>
            </div>
          </div>
        )}

        {stepId === 'setup' && (
          <div className="tradeFormFieldGroup">
            <div className="tradeGuide">
              <Sparkles size={18} />
              <div><b>Paso 2 — Setup</b><p>Contexto técnico. Opcional, pero alimenta Analytics y Edge Lab.</p></div>
            </div>
            <div className="tradeFormGrid formGrid labeled">
              <Field label="Sesión">
                <select className="input" value={form.session || 'NY'} onChange={e => ch('session', e.target.value)}>
                  {tradeSessionOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Dirección">
                <select className="input" value={form.side || 'BUY'} onChange={e => ch('side', e.target.value)}>
                  <option>BUY</option><option>SELL</option>
                </select>
              </Field>
              <Field label="Tipo de trade / sistema" hint="Sistema oficial del club u otro modelo.">
                <select className="input" value={form.tradeSystem || 'Sistema de Moisés'} onChange={e => ch('tradeSystem', e.target.value)}>
                  <option>Sistema de Moisés</option><option>Otro</option>
                </select>
              </Field>
              {(form.tradeSystem || 'Sistema de Moisés') === 'Sistema de Moisés' ? (
                <>
                  <Field label="Patrón de Moisés" hint="Solo patrones reales del playbook.">
                    <select className="input" value={form.pattern || 'Método Estructural: ChoCH en M1'} onChange={e => ch('pattern', e.target.value)}>
                      {moisesPatterns.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                  <Field label="Confluencias usadas" hint="Tocá una vez para activar/desactivar.">
                    <div className="chipSelect touchSafe">
                      {moisesConfluences.map(x => (
                        <button type="button" key={x} aria-pressed={formConfluences.includes(x)} className={formConfluences.includes(x) ? 'on' : ''} onPointerDown={(e) => { e.preventDefault(); toggleConfluence(x); }} onClick={(e) => e.preventDefault()}>
                          {formConfluences.includes(x) ? '✓ ' : ''}{x}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              ) : (
                <Field label="Especificar sistema"><input className="input" placeholder="Nombre de tu sistema" value={form.otherSystem || ''} onChange={e => ch('otherSystem', e.target.value)} /></Field>
              )}
              <Field label="Setup / contexto específico" hint="Ej: sweep de Asia + ChoCH M1 + OB.">
                <input className="input" placeholder="Describe el contexto" value={form.setup || ''} onChange={e => ch('setup', e.target.value)} />
              </Field>
              <Field label="Precio de entrada"><DecimalInput value={form.entry || ''} onChange={v => ch('entry', v)} placeholder="Ej: 2350.50" /></Field>
              <Field label="Stop loss"><DecimalInput value={form.sl || ''} onChange={v => { ch('sl', v); ch('stopLoss', v); }} placeholder="Ej: 2347.00" /></Field>
              <Field label="Take profit"><DecimalInput value={form.tp || ''} onChange={v => { ch('tp', v); ch('takeProfit', v); }} placeholder="Ej: 2358.00" /></Field>
              <Field label="Precio de salida"><DecimalInput value={form.exit || ''} onChange={v => ch('exit', v)} placeholder="Ej: 2357.50" /></Field>
              <Field label="Riesgo $" hint="Si lo completás, el resultado en R se calcula automático.">
                <DecimalInput value={form.riskMoney || ''} onChange={v => ch('riskMoney', v)} placeholder="Ej: 100" />
              </Field>
              <Field label="Calidad">
                <select className="input" value={form.quality || 'A'} onChange={e => ch('quality', e.target.value)}>
                  {tradeQualityOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
            </div>
            <TradeTagsPicker
              value={formTags}
              onChange={(next) => ch('tags', next)}
              title="Tags rápidos"
              hint="Opcional. Los tags ayudan a detectar patrones, errores y contextos."
            />
            {!String(form.setup || '').trim() && (
              <p className="tradeFormWarning">Sin setup, Analytics lo agrupará como &apos;Sin setup&apos;.</p>
            )}
          </div>
        )}

        {stepId === 'behavior' && (
          <div className="tradeFormFieldGroup">
            <div className="tradeGuide">
              <Sparkles size={18} />
              <div><b>Paso 3 — Conducta</b><p>Opcional. Mejora la lectura de disciplina y calidad de ejecución.</p></div>
            </div>
            <div className="tradeFormGrid formGrid labeled">
              <Field label="¿Seguiste el plan?">
                <select className="input" value={followedPlanValue} onChange={e => setFollowedPlan(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {FOLLOWED_PLAN_OPTIONS.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="¿Checklist completo?">
                <select className="input" value={checklistCompleteValue} onChange={e => setChecklistComplete(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {CHECKLIST_COMPLETE_OPTIONS.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Error principal">
                <select className="input" value={form.mistakeType || ''} onChange={e => ch('mistakeType', e.target.value)}>
                  {MISTAKE_TYPE_OPTIONS.map(x => <option key={x || 'none'} value={x}>{x || 'Seleccionar...'}</option>)}
                </select>
              </Field>
              <Field label="Emoción antes">
                <select className="input" value={form.emotionBefore || ''} onChange={e => ch('emotionBefore', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {emotionBeforeOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Emoción después">
                <input className="input" placeholder="Ej: neutral, eufórico, frustrado..." value={form.emotionAfter || ''} onChange={e => ch('emotionAfter', e.target.value)} />
              </Field>
              <Field label="Ansiedad (1–10)" hint="Opcional. Ayuda a leer tu estado emocional.">
                <input className="input" type="number" min="1" max="10" step="1" placeholder="1 a 10" value={form.anxiety ?? ''} onChange={e => ch('anxiety', e.target.value)} />
              </Field>
              <Field label="Confianza (1–10)">
                <input className="input" type="number" min="1" max="10" step="1" placeholder="1 a 10" value={form.confidence ?? ''} onChange={e => ch('confidence', e.target.value)} />
              </Field>
              <Field label="Claridad (1–10)">
                <input className="input" type="number" min="1" max="10" step="1" placeholder="1 a 10" value={form.clarity ?? ''} onChange={e => ch('clarity', e.target.value)} />
              </Field>
              <Field label="Impulso de recuperar">
                <select
                  className="input"
                  value={form.recoveryImpulse === true ? 'Sí' : form.recoveryImpulse === false ? 'No' : ''}
                  onChange={e => ch('recoveryImpulse', e.target.value === 'Sí' ? true : e.target.value === 'No' ? false : undefined)}
                >
                  <option value="">Seleccionar...</option>
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </Field>
              <Field label="Después del trade">
                <select className="input" value={form.postTradeBehavior || ''} onChange={e => ch('postTradeBehavior', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {postTradeBehaviorOptions.map(x => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <div className="behaviorScoreBox">
                <span>Score de conducta</span>
                <b>{behaviorScoreFromTrade(form)}/100</b>
                <small>{behaviorScoreLabel(behaviorScoreFromTrade(form))}</small>
              </div>
            </div>
            <Field label="Durante la ejecución" hint="Podés marcar varias.">
              <div className="chipSelect behaviorChips">
                {executionBehaviorOptions.map(x => (
                  <button type="button" key={x} className={formExecutionBehaviors.includes(x) ? 'on' : ''} onClick={() => ch('executionBehaviors', formExecutionBehaviors.includes(x) ? formExecutionBehaviors.filter(a => a !== x) : [...formExecutionBehaviors, x])}>
                    {formExecutionBehaviors.includes(x) ? '✓ ' : ''}{x}
                  </button>
                ))}
              </div>
            </Field>
            <details className="tradeFormAdvanced">
              <summary>Revisión avanzada del trader (opcional)</summary>
              <TraderBehaviorReviewFields form={form} ch={ch} />
              <h3 className="tradeFormSubhead">Checklist operativo</h3>
              <div className="checks">{checklistBase.map(c => <button type="button" key={c} className={formChecklist.includes(c) ? 'on' : ''} onClick={() => toggle(c)}>{c}</button>)}</div>
            </details>
            {softWarnings.filter(w => w.id === 'emotion' || w.id === 'checklist').map(w => (
              <p key={w.id} className={`tradeFormWarning${w.tone === 'soft' ? ' tradeFormWarning--soft' : ''}`}>{w.message}</p>
            ))}
          </div>
        )}

        {stepId === 'evidence' && (
          <div className="tradeFormFieldGroup">
            <div className="tradeGuide">
              <Sparkles size={18} />
              <div><b>Paso 4 — Evidencia</b><p>Nota, captura y resumen antes de guardar.</p></div>
            </div>
            <div className="tradeFormGrid formGrid labeled">
              <Field label="Link de captura" hint="Drive, Discord, Telegram o imagen externa.">
                <input className="input" placeholder="https://..." value={form.captureLink || ''} onChange={e => ch('captureLink', e.target.value)} />
              </Field>
              <Field label="Captura del trade" hint="Imagen para documentar la ejecución.">
                <label className="ghost file futureUpload"><ImageIcon size={16} />Seleccionar imagen<input type="file" accept="image/*" onChange={captureFile} /></label>
                {form.captureFileName && <small className="fileName">Seleccionado: {form.captureFileName}</small>}
              </Field>
              <div className="wide">
                <Field label="Nota / lección" hint="Qué aprendiste, qué repetir y qué corregir.">
                  <TextareaWithEmoji className="input" value={form.lesson || ''} onChange={e => ch('lesson', e.target.value)} placeholder="Ej: ejecuté limpio, respeté la zona y confirmé patrón..." />
                </Field>
              </div>
              <div className="wide">
                <Field label="Journal emocional privado" hint="Opcional. Espacio personal.">
                  <TextareaWithEmoji className="input" value={form.privateJournal || ''} onChange={e => ch('privateJournal', e.target.value)} placeholder="Qué pensaste, qué sentiste, impulso, miedo, confianza..." />
                </Field>
              </div>
            </div>
            <MentorReviewRequest form={form} ch={ch} />
            <div className="tradeFormSummary" aria-label="Resumen del trade">
              <b>Resumen antes de guardar</b>
              <ul>
                <li><span>Fecha</span><strong>{summary.date}</strong></li>
                <li><span>Cuenta</span><strong>{summary.account}</strong></li>
                <li><span>Activo</span><strong>{summary.asset}</strong></li>
                <li><span>Resultado</span><strong>{summary.result}</strong></li>
                <li><span>P/L</span><strong>{summary.pnl}</strong></li>
                <li><span>R</span><strong>{summary.rMultiple}</strong></li>
                <li><span>Setup</span><strong>{summary.setup}</strong></li>
                <li><span>Sesión / lado</span><strong>{summary.session} · {summary.side}</strong></li>
                <li><span>Plan</span><strong>{summary.followedPlan}</strong></li>
                <li><span>Emoción</span><strong>{summary.emotionBefore} → {summary.emotionAfter}</strong></li>
                <li><span>Tags</span><strong>{formTags.length ? formTags.join(', ') : '—'}</strong></li>
              </ul>
            </div>
            {softWarnings.map(w => (
              <p key={w.id} className={`tradeFormWarning${w.tone === 'soft' ? ' tradeFormWarning--soft' : ''}`}>{w.message}</p>
            ))}
          </div>
        )}
      </TradeFormStepper>
    </Card>
  );
}
