import { useEffect, useMemo, useState } from 'react';
import { accountName, normalizedAccounts } from '../../lib/tradeUtils.js';
import {
  filterTradesByActiveAccounts,
  filterAnalyticsTrades,
  getAnalyticsFilterOptions
} from '../../lib/analyticsUtils.js';

function activeAccountNames(settings = {}) {
  return normalizedAccounts(settings).map(a => a.name).filter(Boolean);
}

function defaultActiveAccount(settings = {}) {
  const names = activeAccountNames(settings);
  return names.length === 1 ? names[0] : '__all__';
}

export function useAnalyticsFilters(trades = [], settings = {}) {
  const accountOptions = useMemo(
    () => activeAccountNames(settings).sort(),
    [settings?.accounts, settings?.initialBalance]
  );
  const accounts = useMemo(
    () => (accountOptions.length > 1 ? ['__all__', ...accountOptions] : accountOptions),
    [accountOptions]
  );

  const [activeAccount, setActiveAccount] = useState(
    () => localStorage.getItem('mtc-active-account') || defaultActiveAccount(settings)
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [session, setSession] = useState('Todos');
  const [setup, setSetup] = useState('Todos');
  const [asset, setAsset] = useState('Todos');

  const effectiveActive = accounts.includes(activeAccount)
    ? activeAccount
    : (accountOptions.length === 1 ? accountOptions[0] : '__all__');

  useEffect(() => {
    const nextDefault = accountOptions.length === 1 ? accountOptions[0] : '__all__';
    if (!accounts.includes(activeAccount)) setActiveAccount(nextDefault);
  }, [accounts.join('|'), activeAccount]);

  useEffect(() => {
    localStorage.setItem('mtc-active-account', effectiveActive);
  }, [effectiveActive]);

  const accountFiltered = useMemo(() => {
    const activeTrades = filterTradesByActiveAccounts(trades, settings);
    return effectiveActive === '__all__'
      ? activeTrades
      : activeTrades.filter(t => accountName(t) === effectiveActive);
  }, [trades, settings?.accounts, settings?.initialBalance, effectiveActive]);

  const filterOptions = useMemo(() => getAnalyticsFilterOptions(accountFiltered), [accountFiltered]);

  const filtered = useMemo(
    () => filterAnalyticsTrades(accountFiltered, { dateFrom, dateTo, session, setup, asset }),
    [accountFiltered, dateFrom, dateTo, session, setup, asset]
  );

  return {
    activeAccount: effectiveActive,
    setActiveAccount,
    accounts,
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
    filterOptions,
    filtered
  };
}
