import React, { useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { toNumberSafe, safeArray, normalizedAccounts } from '../../lib/tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from '../../lib/analyticsUtils.js';
import { Field, DecimalInput } from './TradeFormField.jsx';
import { TextareaWithEmoji } from './TradeTextarea.jsx';
import { MentorReviewRequest } from './MentorReviewRequest.jsx';
import { TraderBehaviorReviewFields } from './TraderBehaviorReviewFields.jsx';
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

export function TradeForm({ form, setForm, profile, data, db, uploadFile, uid, toast }) {
  const [busy, setBusy] = useState(false);
  const [captureFileObj, setCaptureFileObj] = useState(null);
  const accountOptions = normalizedAccounts(data?.settings || {});
  const selectedAccountValue = accountOptions.some(a => a.name === form.account) ? form.account : (accountOptions[0]?.name || 'Cuenta principal');
  const formChecklist = safeArray(form.checklist);
  const formConfluences = safeArray(form.confluencesUsed);
  const formExecutionBehaviors = safeArray(form.executionBehaviors);
  const ch = createTradeFormChangeHandler(setForm);
  const toggle = (x) => ch('checklist', formChecklist.includes(x) ? formChecklist.filter(a => a !== x) : [...formChecklist, x]);
  const toggleConfluence = (x) => ch('confluencesUsed', formConfluences.includes(x) ? formConfluences.filter(a => a !== x) : [...formConfluences, x]);

  async function save() {
    setBusy(true);
    console.info('saveTrade:start');
    try {
      let captureUrl = form.captureUrl || '';
      if (captureFileObj) {
        try {
          captureUrl = await uploadFile(`users/${profile.uid}/trades/${uid()}-${captureFileObj.name}`, captureFileObj);
        } catch (e) {
          console.warn('Captura no guardada', e?.message);
        }
      }
      const result = await persistTrade({
        db,
        form,
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

  const resultClass = toNumberSafe(form.resultMoney) > 0 ? 'resultPreview pos' : toNumberSafe(form.resultMoney) < 0 ? 'resultPreview neg' : 'resultPreview';
  const quickFromChecklist = !!form.createdFromChecklist;

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

  return (
    <Card title={form.id ? 'Editar trade' : 'Nuevo trade'} sub="Carga solo lo medible. Primero resultado en dinero, % y R; después contexto y checklist." className="tradeFormCard">
      <div className="tradeGuide">
        <Sparkles size={18} />
        <div><b>Guía rápida</b><p>En móvil ya podés escribir negativos y decimales. Usá -1.25 o -1,25 y la app lo normaliza al guardar.</p></div>
      </div>
      <div className="resultStrip resultHero editableResults">
        <div className={resultClass}><span>Ganancia / Pérdida en $</span><DecimalInput className="resultLiveInput" value={form.resultMoney} onChange={v => ch('resultMoney', v)} placeholder="300" prefix="$" /><small>Dinero generado o perdido en este trade. Ej: -150.50</small></div>
        <div className={resultClass}><span>Ganancia / Pérdida en %</span><DecimalInput className="resultLiveInput" value={form.resultPct} onChange={v => ch('resultPct', v)} placeholder="2.5" suffix="%" /><small>% hecho o perdido sobre la cuenta. Ej: -0.75</small></div>
        <div className={resultClass}><span>Resultado en R</span><DecimalInput className="resultLiveInput" value={form.resultR} onChange={v => ch('resultR', v)} placeholder="3" suffix="R" /><small>Multiplicador de riesgo. Stop completo = -1R.</small></div>
      </div>
      <div className="formGrid labeled">
        <Field label="Fecha"><input className="input" type="date" value={form.date} onChange={e => ch('date', e.target.value)} /></Field>
        <Field label="Resultado" hint="Campo mínimo requerido para guardar.">
          <select className="input" value={form.result || ''} onChange={e => ch('result', e.target.value)}>
            <option value="">Seleccionar resultado...</option>
            {tradeResultOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Cuenta / challenge">
          <select className="input" value={selectedAccountValue} onChange={e => ch('account', e.target.value)}>
            {accountOptions.map(a => <option key={a.name}>{a.name}</option>)}
          </select>
          <small>Configura cuentas y capital desde Perfil.</small>
        </Field>
        <Field label="Activo"><input className="input" placeholder="XAUUSD, NAS100, EURUSD..." value={form.asset} onChange={e => ch('asset', e.target.value.toUpperCase())} /></Field>
        <Field label="Sesión">
          <select className="input" value={form.session} onChange={e => ch('session', e.target.value)}>
            {tradeSessionOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Dirección">
          <select className="input" value={form.side} onChange={e => ch('side', e.target.value)}>
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
            <Field label="Confluencias usadas" hint="Tocá una vez para activar/desactivar. En mobile queda visible y seleccionable.">
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
        <Field label="Setup / contexto específico" hint="Ej: sweep de Asia + ChoCH M1 + OB."><input className="input" placeholder="Describe el contexto" value={form.setup || ''} onChange={e => ch('setup', e.target.value)} /></Field>
        <Field label="Precio de entrada" hint="Precio de entrada."><DecimalInput value={form.entry || ''} onChange={v => ch('entry', v)} placeholder="Ej: 2350.50" /></Field>
        <Field label="Stop loss" hint="Precio del stop."><DecimalInput value={form.sl || ''} onChange={v => ch('sl', v)} placeholder="Ej: 2347.00" /></Field>
        <Field label="Take profit" hint="Objetivo planificado."><DecimalInput value={form.tp || ''} onChange={v => ch('tp', v)} placeholder="Ej: 2358.00" /></Field>
        <Field label="Precio de salida" hint="Precio real de salida."><DecimalInput value={form.exit || ''} onChange={v => ch('exit', v)} placeholder="Ej: 2357.50" /></Field>
        <Field label="Riesgo $" hint="Si lo completás, el resultado en R se calcula automático."><DecimalInput value={form.riskMoney || ''} onChange={v => ch('riskMoney', v)} placeholder="Ej: 100" /></Field>
        <div className="formNote wide"><b>Resultado cargado arriba</b><span>Los campos de $, % y R se completan en las tarjetas superiores. El R se calcula automático si cargas Riesgo $.</span></div>
        <Field label="Calidad">
          <select className="input" value={form.quality} onChange={e => ch('quality', e.target.value)}>
            {tradeQualityOptions.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Link de captura" hint="Drive, Discord, Telegram o imagen externa."><input className="input" placeholder="https://..." value={form.captureLink || ''} onChange={e => ch('captureLink', e.target.value)} /></Field>
        <Field label="Captura del trade" hint="Sumá una imagen para documentar la ejecución y revisar tu proceso con más claridad.">
          <label className="ghost file futureUpload"><ImageIcon size={16} />Seleccionar imagen<input type="file" accept="image/*" onChange={captureFile} /></label>
          {form.captureFileName && <small className="fileName">Seleccionado: {form.captureFileName}</small>}
        </Field>
        <TextareaWithEmoji className="input wide" placeholder="Notas / lección / por qué era válido / qué mejorar" value={form.lesson || ''} onChange={e => ch('lesson', e.target.value)} />
      </div>
      <div className="behaviorJournal">
        <div><h3>Comportamiento del trader</h3><p>Este score mide proceso, no dinero. Un trade perdedor puede ser disciplinado y un trade ganador puede ser impulsivo.</p></div>
        <div className="formGrid labeled">
          <Field label="Estado emocional antes">
            <select className="input" value={form.emotionBefore || ''} onChange={e => ch('emotionBefore', e.target.value)}>
              <option value="">Seleccionar...</option>
              {emotionBeforeOptions.map(x => <option key={x}>{x}</option>)}
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
      </div>
      <TraderBehaviorReviewFields form={form} ch={ch} />
      <div className="emotionalJournal">
        <div><h3>Journal emocional privado</h3><p>Espacio personal para registrar cómo te sentiste. Esto no es para mostrar resultados: es para detectar patrones internos, impulsividad, ansiedad, confianza o miedo.</p></div>
        <div className="formGrid labeled">
          <Field label="Antes del trade" hint="Estado mental previo a entrar."><input className="input" placeholder="Ej: tranquilo, ansioso, confiado..." value={form.emotionBefore || ''} onChange={e => ch('emotionBefore', e.target.value)} /></Field>
          <Field label="Durante el trade" hint="Qué sentiste mientras estaba abierto."><input className="input" placeholder="Ej: presión, calma, ganas de cerrar..." value={form.emotionDuring || ''} onChange={e => ch('emotionDuring', e.target.value)} /></Field>
          <Field label="Después del trade" hint="Reacción emocional al resultado."><input className="input" placeholder="Ej: neutral, eufórico, frustrado..." value={form.emotionAfter || ''} onChange={e => ch('emotionAfter', e.target.value)} /></Field>
          <TextareaWithEmoji className="input wide" placeholder="Escribí libremente: qué pensaste, qué sentiste, si hubo impulso, miedo, confianza, apego al resultado o claridad. Este registro es privado y te ayuda a evolucionar." value={form.privateJournal || ''} onChange={e => ch('privateJournal', e.target.value)} />
        </div>
      </div>
      <h3>Checklist operativo</h3>
      <div className="checks">{checklistBase.map(c => <button type="button" key={c} className={formChecklist.includes(c) ? 'on' : ''} onClick={() => toggle(c)}>{c}</button>)}</div>
      <MentorReviewRequest form={form} ch={ch} />
      <div className="row">
        <button className="primary" onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar trade'}</button>
        <button className="ghost" onClick={() => setForm(null)}>Cancelar</button>
      </div>
    </Card>
  );
}
