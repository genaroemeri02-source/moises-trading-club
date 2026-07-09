/**
 * Mobile viewport sync for iOS PWA / Safari.
 *
 * Stability contracts (see APP_STABILITY_AUDIT.md):
 * - No bottom dock. --mobile-dock-gap / tabbar heights always 0px.
 * - Never listen to visualViewport.scroll.
 * - Never mutate --app-height during an active scroll/touch gesture.
 * - Never set body position:fixed or touch scrollTop.
 * - --app-height is AUXILIARY only (e.g. command-sheet max-height).
 *   It must NOT size html/body/#root/.appShell/.main on mobile.
 */

let initialized = false;
let timers = [];
let lastAppliedHeight = 0;
let lastAppliedWidth = 0;
let gestureLock = false;
let gestureUnlockTimer = null;

const HEIGHT_EPSILON_PX = 48;

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

function markGestureLock() {
  gestureLock = true;
  if (gestureUnlockTimer) window.clearTimeout(gestureUnlockTimer);
  gestureUnlockTimer = window.setTimeout(() => {
    gestureLock = false;
    gestureUnlockTimer = null;
  }, 180);
}

function applyViewportVars({ force = false } = {}) {
  if (!force && gestureLock) return;

  const root = document.documentElement;
  const ios = isIOSDevice();
  const standalone = isStandalonePWA();
  const h = getViewportHeight();
  const w = getViewportWidth();

  // Ignore chrome-driven jitter during/after scroll (URL bar show/hide).
  if (
    !force &&
    lastAppliedHeight > 0 &&
    Math.abs(h - lastAppliedHeight) < HEIGHT_EPSILON_PX &&
    lastAppliedWidth > 0 &&
    Math.abs(w - lastAppliedWidth) < 16
  ) {
    return;
  }

  lastAppliedHeight = h;
  lastAppliedWidth = w;

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

function scheduleViewportSync({ force = false } = {}) {
  if (!force && gestureLock) return;

  timers.forEach(clearTimeout);
  timers = [];

  applyViewportVars({ force });
  requestAnimationFrame(() => applyViewportVars({ force }));

  [80, 220, 500].forEach((delay) => {
    timers.push(setTimeout(() => applyViewportVars({ force }), delay));
  });
}

function onViewportGeometryChange() {
  // Geometry events often fire mid-scroll on iOS when chrome collapses.
  // Never force-apply here; gesture lock + epsilon guard protect scroll.
  scheduleViewportSync({ force: false });
}

export function initMobileViewportManager() {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  initialized = true;

  scheduleViewportSync({ force: true });

  window.addEventListener('load', () => scheduleViewportSync({ force: true }), { passive: true });
  window.addEventListener('orientationchange', () => scheduleViewportSync({ force: true }), {
    passive: true,
  });
  window.addEventListener('pageshow', () => scheduleViewportSync({ force: true }), { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleViewportSync({ force: true });
  });

  // resize / vv.resize are chrome-sensitive on iOS — never force during gesture.
  window.addEventListener('resize', onViewportGeometryChange, { passive: true });
  window.addEventListener('focus', onViewportGeometryChange, { passive: true });
  window.visualViewport?.addEventListener('resize', onViewportGeometryChange, { passive: true });

  window.addEventListener('touchstart', markGestureLock, { passive: true, capture: true });
  window.addEventListener('touchmove', markGestureLock, { passive: true, capture: true });
  window.addEventListener('touchend', markGestureLock, { passive: true, capture: true });
  window.addEventListener('scroll', markGestureLock, { passive: true, capture: true });

  // IMPORTANT:
  // Do NOT listen to visualViewport.scroll.
  // Do NOT rewrite --app-height while the user is scrolling.
}
