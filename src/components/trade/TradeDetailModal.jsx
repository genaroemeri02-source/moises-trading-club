import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Edit3, Share2, Trash2, X } from 'lucide-react';
import { money, pct } from '../../lib/formatUtils.js';
import { safeArray, normalizeTradeSetup } from '../../lib/tradeUtils.js';
import { behaviorScoreFromTrade, behaviorScoreLabel } from '../../lib/analyticsUtils.js';
import { DetailBlock, TraderBehaviorReviewDetail } from './TraderBehaviorReviewDetail.jsx';
import { mentorStatusLabel } from './tradeFormConstants.js';

export function TradeDetailModal({ trade, onClose, onEdit, onDelete, data, onExport, ShareModal }) {
  const [shareOpen, setShareOpen] = useState(false);
  const executionBehaviors = safeArray(trade.executionBehaviors);
  const confluencesUsed = safeArray(trade.confluencesUsed);
  const checklist = safeArray(trade.checklist);
  useEffect(() => {
    document.body.classList.add('trade-detail-modal-open');
    return () => document.body.classList.remove('trade-detail-modal-open');
  }, []);
  const value = Number(trade.resultMoney || 0);
  const pctVal = Number(trade.resultPct || 0);
  const rVal = Number(trade.resultR || 0);
  const modal = (
    <>
      <div className="modal tradeDetailOverlay">
        <div className="modalCard tradeDetailModal">
          <div className="modalHead">
            <div>
              <h3>{trade.asset} · {trade.side}</h3>
              <p>{trade.date} · {trade.session} · {trade.tradeSystem || 'Sistema de Moisés'}</p>
            </div>
            <div className="modalActions">
              <button className="exportModalButton compact" onClick={() => onExport(trade, 'json')}><Download size={15} />Exportar JSON</button>
              <button className="exportModalButton compact" onClick={() => onExport(trade, 'csv')}><Download size={15} />Exportar CSV</button>
              <button className="exportModalButton compact" onClick={() => setShareOpen(true)}><Share2 size={15} />Compartir revisión</button>
              <button className="ghost compact" onClick={onEdit}><Edit3 size={15} />Editar</button>
              {onDelete && <button className="ghost danger compact" onClick={onDelete}><Trash2 size={15} />Eliminar</button>}
              <button onClick={onClose}><X size={20} /></button>
            </div>
          </div>
          <div className="detailKpis">
            <div className={value > 0 ? 'pos' : value < 0 ? 'neg' : ''}><span>P/L $</span><b>{value > 0 ? '+' : ''}{money(value)}</b></div>
            <div className={pctVal > 0 ? 'pos' : pctVal < 0 ? 'neg' : ''}><span>P/L %</span><b>{pctVal > 0 ? '+' : ''}{pct(pctVal)}</b></div>
            <div className={rVal > 0 ? 'pos' : rVal < 0 ? 'neg' : ''}><span>Resultado R</span><b>{rVal > 0 ? '+' : ''}{rVal.toFixed(2)}R</b></div>
            <div><span>Calidad</span><b>{trade.quality || '—'}</b></div>
          </div>
          {trade.createdFromChecklist || trade.checklistId ? (
            <div className={`linkedValidationCard ${trade.checklistFinalGreen ? 'ok' : 'warn'}`}>
              <div>
                <span>Validación vinculada</span>
                <b>{trade.checklistFinalGreen ? 'Luz verde' : 'Luz roja / incompleta'} · Score {trade.checklistScore || 0}/100</b>
                <small>{trade.checklistAPlus ? 'Setup A+' : trade.executedWithoutFullChecklist ? 'Ejecutado sin checklist completo' : 'Checklist vinculado'}</small>
              </div>
              <div className="detailChips">
                <span>{trade.checklistOperationalState || 'Estado no registrado'}</span>
                {trade.checklistPattern && <span>{trade.checklistPattern}</span>}
                {trade.checklistZoneM15 && <span>{trade.checklistZoneM15}</span>}
                {trade.checklistLiquidity && <span>{trade.checklistLiquidity}</span>}
              </div>
              {trade.executedWithoutFullChecklist && <p className="warnText">Este trade fue ejecutado sin checklist completo.</p>}
              <button className="ghost compact" onClick={() => { localStorage.setItem('mtc-open-checklist', trade.checklistId || ''); window.dispatchEvent(new CustomEvent('mtc-tab', { detail: 'checklist' })); }}>Ver checklist original</button>
            </div>
          ) : null}
          {trade.mentorReviewRequested && (
            <div className={`mentorReviewStatusCard ${trade.mentorReviewStatus || 'pending'}`}>
              <span>Revisión del mentor</span>
              <b>{mentorStatusLabel(trade.mentorReviewStatus || 'pending')}</b>
              <small>
                Foco: {trade.mentorReviewFocus || 'general'}
                {trade.mentorReviewRequestedAt ? ` · solicitado ${String(trade.mentorReviewRequestedAt).slice(0, 10)}` : ''}
              </small>
              {trade.mentorReviewNote && <p><b>Pregunta del trader:</b> {trade.mentorReviewNote}</p>}
              {trade.mentorReviewResponse && <p><b>Devolución:</b> {trade.mentorReviewResponse}</p>}
            </div>
          )}
          <div className="detailGrid">
            <DetailBlock title="Patrón de Moisés"><p>{trade.pattern || trade.otherSystem || '—'}</p></DetailBlock>
            <DetailBlock title="Setup / contexto"><p>{normalizeTradeSetup(trade)}</p></DetailBlock>
            <DetailBlock title="Precios"><p>{`Entry: ${trade.entry || '—'} · SL: ${trade.sl || '—'} · TP: ${trade.tp || '—'} · Exit: ${trade.exit || '—'} · Riesgo: ${trade.riskMoney ? money(trade.riskMoney) : '—'}`}</p></DetailBlock>
            <DetailBlock title="Confluencias usadas">
              <div className="detailChips">{confluencesUsed.length ? confluencesUsed.map(x => <span key={x}>{x}</span>) : <em>Sin confluencias registradas</em>}</div>
            </DetailBlock>
            <DetailBlock title="Checklist operativo">
              <div className="detailChips">{checklist.length ? checklist.map(x => <span key={x}>{x}</span>) : <em>Sin checklist marcado</em>}</div>
            </DetailBlock>
            <DetailBlock title="Comportamiento">
              <p>
                <b>{Number(trade.behaviorScore || behaviorScoreFromTrade(trade))}/100</b> · {trade.behaviorScoreLabel || behaviorScoreLabel(behaviorScoreFromTrade(trade))}
                <br />Antes: {trade.emotionBefore || '—'}
                <br />Durante: {executionBehaviors.join(', ') || '—'}
                <br />Después: {trade.postTradeBehavior || trade.emotionAfter || '—'}
              </p>
            </DetailBlock>
            <TraderBehaviorReviewDetail trade={trade} />
            <DetailBlock title="Notas / lección"><p>{trade.lesson || '—'}</p></DetailBlock>
            <DetailBlock title="Captura">
              <p>
                {trade.captureUrl ? <a href={trade.captureUrl} target="_blank" rel="noreferrer">Abrir imagen subida</a>
                  : trade.captureLink ? <a href={trade.captureLink} target="_blank" rel="noreferrer">Abrir captura</a>
                    : (trade.captureFileName || '—')}
              </p>
            </DetailBlock>
          </div>
          <div className="emotionPanel">
            <h3>Journal emocional privado</h3>
            <div className="detailGrid">
              <DetailBlock title="Antes del trade"><p>{trade.emotionBefore || '—'}</p></DetailBlock>
              <DetailBlock title="Durante el trade"><p>{trade.emotionDuring || '—'}</p></DetailBlock>
              <DetailBlock title="Después del trade"><p>{trade.emotionAfter || '—'}</p></DetailBlock>
              <DetailBlock title="Registro libre"><p>{trade.privateJournal || '—'}</p></DetailBlock>
            </div>
          </div>
        </div>
      </div>
      {shareOpen && ShareModal && <ShareModal trade={trade} onClose={() => setShareOpen(false)} />}
    </>
  );
  return createPortal(modal, document.body);
}
