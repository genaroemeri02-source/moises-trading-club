import React, { useMemo, useState } from 'react';
import {
  buildTradeShareFilename, renderTradeStoryPng
} from '../../lib/sharePngUtils.js';
import { SharePreviewModal } from './SharePreviewModal.jsx';

export function TradeShareModal({ trade, onClose }) {
  const [privacy, setPrivacy] = useState({ hideMoney: false, hidePrices: false, hideNote: false });
  const renderBlob = useMemo(() => () => renderTradeStoryPng(trade, privacy), [trade, privacy]);
  const filename = buildTradeShareFilename(trade);
  const toggle = k => setPrivacy(prev => ({ ...prev, [k]: !prev[k] }));
  return <SharePreviewModal title="Compartir revisión del trade" filename={filename} renderBlob={renderBlob} onClose={onClose}>
    <b>Privacidad</b>
    <span>Controlá qué datos mostrar en la imagen.</span>
    <label><input type="checkbox" checked={privacy.hideMoney} onChange={() => toggle('hideMoney')} />Ocultar P/L monetario</label>
    <label><input type="checkbox" checked={privacy.hidePrices} onChange={() => toggle('hidePrices')} />Ocultar precios</label>
    <label><input type="checkbox" checked={privacy.hideNote} onChange={() => toggle('hideNote')} />Ocultar nota</label>
  </SharePreviewModal>;
}
