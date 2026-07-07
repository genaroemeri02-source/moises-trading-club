import { Crown } from 'lucide-react';
import { sessionNameNY } from './dashboardUtils.js';
import { ResetTicker } from './ResetTicker.jsx';

export function DashboardHero({ activeLabel, headerActions }) {
  return (
    <section className="dashboardCommandHeader">
      <div>
        <span className="controlBadge"><Crown size={15} /> Centro de Control Operativo</span>
        <h2>Centro de Control Operativo</h2>
        <p>{activeLabel} · {sessionNameNY()} · Rollover 17:00 NY · <ResetTicker /></p>
      </div>
      <div className="dashboardHeaderActions">
        {headerActions}
      </div>
    </section>
  );
}
