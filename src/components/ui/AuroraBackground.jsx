import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function readIsDark() {
  return document.documentElement?.dataset?.theme !== 'light';
}

function readIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 860px)').matches;
}

/**
 * Ambient Aurora layer — mirrors laboratorio-edge-aurora.html mockup.
 * Portaled to document.body (z-index 0); app shell stays transparent above.
 */
export function AuroraBackground() {
  const [isDark, setIsDark] = useState(readIsDark);
  const [isMobile, setIsMobile] = useState(readIsMobile);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setIsDark(readIsDark());
      setIsMobile(readIsMobile());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    const mqMobile = window.matchMedia('(max-width: 860px)');
    mqMobile.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      mqMobile.removeEventListener('change', sync);
    };
  }, []);

  if (!mounted || !isDark) return null;

  return createPortal(
    <div className="auroraAmbient" aria-hidden="true">
      {!isMobile && <div className="auroraOrb auroraOrb--violet" />}
      <div className="auroraOrb auroraOrb--cyan" />
      <div className="auroraOrb auroraOrb--magenta" />
    </div>,
    document.body
  );
}
