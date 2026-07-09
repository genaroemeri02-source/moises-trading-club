/**
 * Mobile viewport sync for iOS PWA / Safari.
 *
 * Contract:
 * - No bottom dock. --mobile-dock-gap is always 0px.
 * - Never listen to visualViewport.scroll — rewriting --app-height mid-gesture
 *   resets/bounces natural document scroll on iOS.
 * - Never set body position:fixed or touch scrollTop.
 * - Sync only on bootstrap / resize / orientation / focus / pageshow / visibility / vv.resize.
 */

let initialized = false;
let timers = [];

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

function isStandalonePWA() {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

function getViewportHeight() {
  const values = [
    window.innerHeight,
    document.documentElement?.clientHeight,
    window.visualViewport?.height,
  ]
    .filter((n) => n != null)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 300);

  if (!values.length) return window.innerHeight || 0;

  // iOS standalone: prefer the largest stable value to avoid a stale short viewport.
  if (isIOSDevice() && isStandalonePWA()) return Math.max(...values);

  return window.innerHeight || Math.max(...values);
}

function getViewportWidth() {
  const values = [
    window.innerWidth,
    document.documentElement?.clientWidth,
    window.visualViewport?.width,
  ]
    .filter((n) => n != null)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 200);

  return values.length ? Math.max(...values) : window.innerWidth || 0;
}

function applyViewportVars() {
  const root = document.documentElement;
  const ios = isIOSDevice();
  const standalone = isStandalonePWA();
  const h = getViewportHeight();
  const w = getViewportWidth();

  root.classList.toggle('is-ios', ios);
  root.classList.toggle('is-standalone-pwa', standalone);
  root.classList.toggle('is-ios-standalone', ios && standalone);

  root.style.setProperty('--app-height', `${Math.round(h)}px`);
  root.style.setProperty('--app-width', `${Math.round(w)}px`);
  root.style.setProperty('--app-vh', `${h * 0.01}px`);
  root.style.setProperty('--mobile-dock-gap', '0px');
  root.style.setProperty('--mobile-tabbar-visual-h', '0px');
  root.style.setProperty('--mobile-tabbar-total-h', '0px');
  root.style.setProperty('--mobile-tab-bar-h', '0px');
  root.style.setProperty('--mobile-content-pad-bottom', '28px');

  window.dispatchEvent(
    new CustomEvent('mtc:viewport-sync', {
      detail: { height: h, width: w, gap: 0, isIOS: ios, isStandalone: standalone },
    })
  );
}

function scheduleViewportSync() {
  timers.forEach(clearTimeout);
  timers = [];

  applyViewportVars();
  requestAnimationFrame(applyViewportVars);

  [80, 220, 500].forEach((delay) => {
    timers.push(setTimeout(applyViewportVars, delay));
  });
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

  window.visualViewport?.addEventListener('resize', scheduleViewportSync, { passive: true });

  // IMPORTANT:
  // Do NOT listen to visualViewport.scroll. On iOS PWA it rewrites --app-height
  // during the gesture and snaps natural document scroll back to the anchor.
}
