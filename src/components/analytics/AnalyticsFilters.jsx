import { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { formatSetupLabel } from '../../lib/analyticsUtils.js';

function formatFilterOption(value) {
  if (!value || value === 'Todos') return value;
  return formatSetupLabel(value);
}

function buildDesktopSummary({ activeAccount, session, setup, asset, dateFrom, dateTo }) {
  const parts = [];
  parts.push(activeAccount === '__all__' ? 'Todas las cuentas' : activeAccount);
  parts.push(setup === 'Todos' ? 'Todos los setups' : formatSetupLabel(setup));
  parts.push(session === 'Todos' ? 'Todas las sesiones' : session);
  if (asset !== 'Todos') parts.push(asset);
  if (dateFrom || dateTo) {
    parts.push([dateFrom, dateTo].filter(Boolean).join('–'));
  }
  return parts.join(' · ');
}

function getActiveFilterChips({
  activeAccount,
  dateFrom,
  dateTo,
  session,
  setup,
  asset,
  hasMultipleAccounts
}) {
  const chips = [];
  if (hasMultipleAccounts && activeAccount !== '__all__') {
    chips.push({ key: 'account', label: 'Cuenta', value: activeAccount });
  }
  if (dateFrom) chips.push({ key: 'from', label: 'Desde', value: dateFrom });
  if (dateTo) chips.push({ key: 'to', label: 'Hasta', value: dateTo });
  if (session !== 'Todos') chips.push({ key: 'session', label: 'Sesión', value: session });
  if (setup !== 'Todos') chips.push({ key: 'setup', label: 'Setup', value: formatSetupLabel(setup) });
  if (asset !== 'Todos') chips.push({ key: 'asset', label: 'Símbolo', value: asset });
  return chips;
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
  filterOptions = {},
  tradeCount = 0
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleAccounts = accounts.length > 1;
  const summary = buildDesktopSummary({ activeAccount, session, setup, asset, dateFrom, dateTo });
  const activeChips = getActiveFilterChips({
    activeAccount,
    dateFrom,
    dateTo,
    session,
    setup,
    asset,
    hasMultipleAccounts
  });
  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className={`analyticsFiltersPanel ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button
        type="button"
        className="analyticsFiltersToggle"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="analytics-filters-body"
      >
        <span className="analyticsFiltersToggleLead">
          <Filter size={14} aria-hidden="true" />
          <span className="analyticsFiltersToggleLabel">Filtros</span>
          <span className="analyticsFiltersToggleSummary">{summary}</span>
        </span>
        <ChevronDown
          size={16}
          className="analyticsFiltersToggleChevron"
          aria-hidden="true"
        />
      </button>

      {hasActiveFilters && !expanded && (
        <div className="analyticsFiltersActiveChips" aria-label="Filtros activos">
          {activeChips.map(chip => (
            <span key={chip.key} className="analyticsFiltersActiveChip">
              <em>{chip.label}</em>
              <b>{chip.value}</b>
            </span>
          ))}
        </div>
      )}

      <div
        id="analytics-filters-body"
        className="analyticsFiltersBody"
        hidden={!expanded}
      >
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
    </div>
  );
}
