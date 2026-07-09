/**
 * Temporary scroll-reset debugger.
 * Enable with ?debugScroll=1
 */

export function initScrollDebug() {
  if (typeof window === 'undefined') return;
  if (!window.location.search.includes('debugScroll=1')) return;
  if (window.__MTC_SCROLL_DEBUG__) return;
  window.__MTC_SCROLL_DEBUG__ = true;

  let lastY = window.scrollY || 0;
  let lastMainY = 0;

  const mainEl = () => document.querySelector('.main.appMain');

  const snapshot = (label, extra = {}) => {
    const main = mainEl();
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const mainY = main?.scrollTop || 0;
    console.log('[MTC scroll debug]', label, {
      windowY: y,
      mainY,
      activeElement: document.activeElement?.tagName,
      bodyClass: document.body.className,
      htmlClass: document.documentElement.className,
      appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
      time: new Date().toISOString(),
      ...extra,
    });
  };

  const logJump = (label) => {
    const main = mainEl();
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const mainY = main?.scrollTop || 0;
    if (Math.abs(y - lastY) > 40 || Math.abs(mainY - lastMainY) > 40) {
      console.warn('[MTC scroll JUMP]', label, {
        windowFrom: lastY,
        windowTo: y,
        mainFrom: lastMainY,
        mainTo: mainY,
        bodyClass: document.body.className,
        appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
      });
      console.trace('[MTC scroll trace]');
      lastY = y;
      lastMainY = mainY;
    } else {
      lastY = y;
      lastMainY = mainY;
    }
  };

  window.addEventListener('scroll', () => logJump('window scroll'), { passive: true });
  document.addEventListener(
    'scroll',
    (e) => {
      if (e.target === mainEl()) logJump('main.appMain scroll');
    },
    { passive: true, capture: true }
  );

  const originalScrollTo = window.scrollTo.bind(window);
  window.scrollTo = (...args) => {
    console.warn('[MTC scrollTo called]', args);
    console.trace();
    return originalScrollTo(...args);
  };

  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    console.warn('[MTC scrollIntoView called]', this, args);
    console.trace();
    return originalScrollIntoView.apply(this, args);
  };

  window.addEventListener('mtc:viewport-sync', (e) => {
    snapshot('mtc:viewport-sync', { detail: e.detail });
  });

  snapshot('debugScroll enabled');
}
