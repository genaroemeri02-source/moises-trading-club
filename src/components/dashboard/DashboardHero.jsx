import { sessionNameNY } from './dashboardUtils.js';
import { ResetTicker } from './ResetTicker.jsx';

export function DashboardHero({ activeLabel, headerActions }) {
  return (
    <section className="dashboardCommandHeader">
      <div className="dashboardHeroCopy">
        <span className="controlBadge">Centro de decisión</span>
        <h2>Centro de decisión diario</h2>
        <p className="dashboardHeroLead">
          Estado de cuenta, sesión y foco operativo antes de tomar riesgo.
        </p>
        <p className="dashboardHeroMeta">
          {activeLabel} · {sessionNameNY()} · Rollover 17:00 NY · <ResetTicker />
        </p>
      </div>
      <div className="dashboardHeaderActions">
        {headerActions}
      </div>
    </section>
  );
}
