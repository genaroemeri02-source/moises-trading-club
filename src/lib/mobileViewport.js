/**
 * Mobile viewport sync for iOS PWA.
 * Bottom dock retired — no --mobile-dock-gap.
 * Keeps --app-height stable on standalone resume.
 */

let initialized = false;
let rafId = null;
let timers = [];

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalonePWA() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

function px(value) {
  return `${Math.max(0, Math.round(value || 0))}px`;
}

function getStableViewportHeight() {
  const vv = window.visualViewport;
  const values = [window.innerHeight, document.documentElement?.clientHeight, vv?.height]
    .filter((n) => n != null)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 300);

  if (!values.length) return window.innerHeight || 0;

  if (isIOS() && isStandalonePWA()) {
    const stored = Number(sessionStorage.getItem('mtc:last-app-height') || 0);
    if (Number.isFinite(stored) && stored > 300) values.push(stored);
    return Math.max(...values);
  }

  return vv?.height || window.innerHeight || Math.max(...values);
}

function getStableViewportWidth() {
  const vv = window.visualViewport;
  const values = [window.innerWidth, document.documentElement?.clientWidth, vv?.width]
    .filter((n) => n != null)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 200);

  return values.length ? Math.max(...values) : window.innerWidth || 0;
}

function applyViewportVars() {
  const root = document.documentElement;
  const ios = isIOS();
  const standalone = isStandalonePWA();
  const h = getStableViewportHeight();
  const w = getStableViewportWidth();

  root.classList.toggle('is-ios', ios);
  root.classList.toggle('is-standalone-pwa', standalone);
  root.classList.toggle('is-ios-standalone', ios && standalone);

  root.style.setProperty('--app-height', px(h));
  root.style.setProperty('--app-width', px(w));
  root.style.setProperty('--app-vh', `${h * 0.01}px`);
  root.style.setProperty('--mobile-dock-gap', '0px');
  root.style.setProperty('--mobile-tabbar-visual-h', '0px');
  root.style.setProperty('--mobile-tabbar-total-h', '0px');
  root.style.setProperty('--mobile-tab-bar-h', '0px');
  root.style.setProperty('--mobile-content-pad-bottom', '28px');

  if (ios && standalone && h > 300) {
    try {
      sessionStorage.setItem('mtc:last-app-height', String(Math.round(h)));
    } catch {
      /* private mode */
    }
  }

  document.body?.style.setProperty('--viewport-refresh-token', String(Date.now()));

  window.dispatchEvent(
    new CustomEvent('mtc:viewport-sync', {
      detail: { height: h, width: w, gap: 0, isIOS: ios, isStandalone: standalone },
    })
  );
}

function clearTimers() {
  if (rafId) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
}

function scheduleViewportSync() {
  clearTimers();
  applyViewportVars();
  rafId = window.requestAnimationFrame(() => {
    applyViewportVars();
    rafId = null;
  });
  timers = [60, 180, 350, 700, 1200].map((delay) =>
    window.setTimeout(applyViewportVars, delay)
  );
}

export function initMobileViewportManager() {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  initialized = true;

  scheduleViewportSync();

  window.addEventListener('load', scheduleViewportSync, { passive: true });
  window.addEventListener('resize', scheduleViewportSync, { passive: true });
  window.addEventListener('orientationchange', scheduleViewportSync, { passive: true });
  window.addEventListener('focus', scheduleViewportSync, { passive: true });
  window.addEventListener('pageshow', scheduleViewportSync, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleViewportSync();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportSync, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleViewportSync, { passive: true });
  }
}
