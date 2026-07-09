import React, { useEffect, useState } from 'react';
import { resetCountdown } from '../../lib/dateUtils.js';

/** Local-only countdown text. Must never lift state to Dashboard/App. */
export const ResetTicker = React.memo(function ResetTicker() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (window.location.search.includes('debugScroll=1')) {
      console.log('[MTC mount] ResetTicker');
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(id);
      if (window.location.search.includes('debugScroll=1')) {
        console.log('[MTC unmount] ResetTicker');
      }
    };
  }, []);
  return <>{resetCountdown(now)}</>;
});
