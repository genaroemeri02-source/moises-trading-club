import React, { useEffect, useState } from 'react';
import { resetCountdown } from '../../lib/dateUtils.js';

export function ResetTicker() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{resetCountdown(now)}</>;
}
