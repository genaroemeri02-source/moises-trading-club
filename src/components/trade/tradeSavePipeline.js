import { collection, doc, addDoc, setDoc } from 'firebase/firestore';
import { buildMentorReviewPatch, buildTradeFirestoreDocument, buildTradeSavePayload } from './tradePayload.js';

export function validateTradeFormBeforeSave(form = {}) {
  const hasResultMetric = String(form.resultMoney ?? '').trim() !== '' || String(form.resultPct ?? '').trim() !== '' || String(form.resultR ?? '').trim() !== '';
  if (!String(form.asset || '').trim()) return { ok: false, message: 'Falta seleccionar activo.' };
  if (!String(form.result || '').trim()) return { ok: false, message: 'Falta seleccionar resultado.' };
  if (!hasResultMetric) return { ok: false, message: 'Cargá al menos P/L en $, resultado en R o porcentaje.' };
  return { ok: true };
}

export async function persistTrade({
  db,
  form,
  profile,
  selectedAccountValue,
  captureUrl = '',
  serverTimestamp
}) {
  const validation = validateTradeFormBeforeSave(form);
  if (!validation.ok) return { ok: false, validationError: validation.message };

  const reviewPatch = buildMentorReviewPatch(form, profile.uid);
  const payload = buildTradeSavePayload({ form, profile, selectedAccountValue, captureUrl, reviewPatch });
  const clean = buildTradeFirestoreDocument({ payload, profile, captureUrl, updatedAt: serverTimestamp() });

  if (form.id) {
    const { id, ...rest } = clean;
    await setDoc(doc(db, 'trades', form.id), rest, { merge: true });
    return { ok: true, id: form.id, isUpdate: true, clean };
  }

  const refTrade = await addDoc(collection(db, 'trades'), { ...clean, createdAt: serverTimestamp() });
  if (clean.checklistId && clean.createdFromChecklist) {
    try {
      await setDoc(doc(db, 'checklists', clean.checklistId), {
        linkedTradeId: refTrade.id,
        linkedTradeCreatedAt: serverTimestamp(),
        tradeDeleted: false
      }, { merge: true });
    } catch (e) {
      console.warn('No se pudo vincular checklist', e?.message);
    }
  }
  return { ok: true, id: refTrade.id, isUpdate: false, clean };
}

export function tradeSaveSuccessMessage(result = {}) {
  if (result.isUpdate) return 'Trade actualizado correctamente';
  return result.clean?.createdFromChecklist ? 'Trade creado desde Checklist' : 'Trade guardado correctamente';
}

export function tradeSaveErrorMessage(error) {
  return error?.code === 'permission-denied'
    ? 'No se pudo guardar el trade. Revisá conexión o permisos.'
    : 'No se pudo guardar el trade. Revisá conexión o datos.';
}
