export function initMobileViewportManager() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.documentElement;

  const isIOS =
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true;

  let rafId = null;
  let timers = [];

  function clearTimers() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function applyViewportVars() {
    const visualViewport = window.visualViewport;

    const viewportHeight =
      visualViewport?.height ||
      window.innerHeight ||
      document.documentElement.clientHeight;

    const viewportWidth =
      visualViewport?.width ||
      window.innerWidth ||
      document.documentElement.clientWidth;

    root.style.setProperty('--app-vh', `${viewportHeight * 0.01}px`);
    root.style.setProperty('--app-height', `${viewportHeight}px`);
    root.style.setProperty('--app-width', `${viewportWidth}px`);

    root.classList.toggle('is-ios', Boolean(isIOS));
    root.classList.toggle('is-standalone-pwa', Boolean(isStandalone));
    root.classList.toggle('is-ios-standalone', Boolean(isIOS && isStandalone));

    document.body?.style.setProperty('--viewport-refresh-token', String(Date.now()));
  }

  function scheduleRefresh() {
    clearTimers();

    applyViewportVars();

    rafId = window.requestAnimationFrame(() => {
      applyViewportVars();
      rafId = null;
    });

    timers = [
      window.setTimeout(applyViewportVars, 60),
      window.setTimeout(applyViewportVars, 180),
      window.setTimeout(applyViewportVars, 350),
      window.setTimeout(applyViewportVars, 700),
    ];
  }

  scheduleRefresh();

  window.addEventListener('resize', scheduleRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleRefresh, { passive: true });
  window.addEventListener('focus', scheduleRefresh, { passive: true });
  window.addEventListener('pageshow', scheduleRefresh, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleRefresh();
    }
  });

  window.visualViewport?.addEventListener('resize', scheduleRefresh, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleRefresh, { passive: true });
}
