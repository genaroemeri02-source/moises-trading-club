import { Filter } from 'lucide-react';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';

function formatFilterOption(value) {
  if (!value || value === 'Todos') return value;
  return formatSetupLabel(value);
}

export function AnalyticsFilters({
  activeAccount,
  setActiveAccount,
  accounts = [],
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  session,
  setSession,
  setup,
  setSetup,
  asset,
  setAsset,
  filterOptions = {}
}) {
  return (
    <div className="analyticsFiltersCompact">
      <span className="analyticsFiltersCompactLabel"><Filter size={12} /> Filtros</span>
      <div className="analyticsFiltersCompactGrid">
        <label className="analyticsFilterField">
          <span>Cuenta</span>
          <select className="input small" value={activeAccount} onChange={e => setActiveAccount(e.target.value)}>
            {accounts.map(a => (
              <option key={a} value={a}>{a === '__all__' ? 'Todas' : a}</option>
            ))}
          </select>
        </label>
        <label className="analyticsFilterField">
          <span>Desde</span>
          <input
            className="input small"
            type="date"
            value={dateFrom}
            min={filterOptions.dateMin || undefined}
            max={dateTo || filterOptions.dateMax || undefined}
            onChange={e => setDateFrom(e.target.value)}
          />
        </label>
        <label className="analyticsFilterField">
          <span>Hasta</span>
          <input
            className="input small"
            type="date"
            value={dateTo}
            min={dateFrom || filterOptions.dateMin || undefined}
            max={filterOptions.dateMax || undefined}
            onChange={e => setDateTo(e.target.value)}
          />
        </label>
        <label className="analyticsFilterField">
          <span>Sesión</span>
          <select className="input small" value={session} onChange={e => setSession(e.target.value)}>
            {(filterOptions.sessions || ['Todos']).map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="analyticsFilterField">
          <span>Setup</span>
          <select className="input small" value={setup} onChange={e => setSetup(e.target.value)}>
            {(filterOptions.setups || ['Todos']).map(x => (
              <option key={x} value={x}>{formatFilterOption(x)}</option>
            ))}
          </select>
        </label>
        <label className="analyticsFilterField">
          <span>Símbolo</span>
          <select className="input small" value={asset} onChange={e => setAsset(e.target.value)}>
            {(filterOptions.assets || ['Todos']).map(x => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
