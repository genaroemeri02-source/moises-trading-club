import { useEffect, useState } from 'react';

function readViewport() {
  if (typeof window === 'undefined') {
    return { mobile: false, narrow: false };
  }
  return {
    mobile: window.matchMedia('(max-width: 390px)').matches,
    narrow: window.matchMedia('(max-width: 860px)').matches
  };
}

export function useAnalyticsViewport() {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 390px)');
    const mqNarrow = window.matchMedia('(max-width: 860px)');
    const update = () => setViewport({
      mobile: mqMobile.matches,
      narrow: mqNarrow.matches
    });
    update();
    mqMobile.addEventListener('change', update);
    mqNarrow.addEventListener('change', update);
    return () => {
      mqMobile.removeEventListener('change', update);
      mqNarrow.removeEventListener('change', update);
    };
  }, []);

  return viewport;
}
