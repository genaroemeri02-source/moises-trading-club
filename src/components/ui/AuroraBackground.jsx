import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function readIsDark() {
  return document.documentElement?.dataset?.theme !== 'light';
}

/**
 * Ambient Aurora layer — mirrors laboratorio-edge-aurora.html mockup.
 * Portaled to document.body (z-index 0); app shell stays transparent above.
 */
export function AuroraBackground() {
  const [isDark, setIsDark] = useState(readIsDark);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => setIsDark(readIsDark());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, []);

  if (!mounted || !isDark) return null;

  return createPortal(
    <div className="auroraAmbient" aria-hidden="true">
      <div className="auroraOrb auroraOrb--violet" />
      <div className="auroraOrb auroraOrb--cyan" />
      <div className="auroraOrb auroraOrb--magenta" />
    </div>,
    document.body
  );
}
