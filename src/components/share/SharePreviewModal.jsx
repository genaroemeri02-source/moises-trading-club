import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, X } from 'lucide-react';
import { downloadGeneratedBlob, shareImageFile } from '../../lib/sharePngUtils.js';

function toast(text, type = 'success') {
  window.dispatchEvent(new CustomEvent('mtc-toast', { detail: { text, type } }));
}

export function SharePreviewModal({ title, filename, renderBlob, onClose, children }) {
  const [blob, setBlob] = useState(null), [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    document.body.classList.add('share-modal-open');
    return () => document.body.classList.remove('share-modal-open');
  }, []);
  useEffect(() => {
    let alive = true, objectUrl = '';
    async function run() {
      setBusy(true); setError('');
      try {
        const nextBlob = await renderBlob();
        if (!nextBlob) throw new Error('No se pudo generar la imagen.');
        objectUrl = URL.createObjectURL(nextBlob);
        if (alive) { setBlob(nextBlob); setUrl(objectUrl); }
        else URL.revokeObjectURL(objectUrl);
      } catch (e) { if (alive) setError(e?.message || 'No se pudo generar la imagen.'); }
      finally { if (alive) setBusy(false); }
    }
    run();
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [renderBlob]);
  async function share() {
    if (!blob) return;
    try {
      const shared = await shareImageFile(blob, filename, title);
      if (shared) toast('Share sheet abierto');
      else { downloadGeneratedBlob(blob, filename); toast('Tu navegador no soporta compartir archivos. Descargué el PNG.'); }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.warn('share_image_failed', e?.message || e);
      downloadGeneratedBlob(blob, filename);
      toast('No se pudo compartir. Descargué el PNG.', 'error');
    }
  }
  return createPortal(<div className="shareOverlay"><div className="shareModalCard"><div className="shareModalHead"><div><h3>{title}</h3><p>Vista previa vertical 9:16 · PNG 1080x1920</p></div><div className="modalActions"><button className="ghost compact" disabled={!blob || busy} onClick={() => downloadGeneratedBlob(blob, filename)}><Download size={15} />Descargar PNG</button><button className="exportModalButton compact" disabled={!blob || busy} onClick={share}><Share2 size={15} />Compartir</button><button onClick={onClose}><X size={20} /></button></div></div><div className="shareModalBody"><aside className="shareControls">{children}{error && <p className="shareError">{error}</p>}{busy && <p className="shareHint">Generando imagen premium...</p>}</aside><div className="storyPreviewFrame">{url ? <img src={url} alt={title} /> : <div className="storyPreviewSkeleton">Generando vista previa...</div>}</div></div></div></div>, document.body);
}
